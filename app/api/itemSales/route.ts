// app/api/item-sales/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { RowDataPacket } from "mysql2";

interface ModifierSaleDetail {
  modifierId: number;
  modifierName: string;
  quantitySoldWithParentMenu: number;
  netSalesFromThisModifier: number;
  hppFromThisModifier: number;
  discountAllocatedToThisModifier: number;
}

interface ItemSalesResponse {
  menuId: number;
  menuName: string;
  category: string;
  quantity: number;
  netSales: number;
  hpp: number;
  discount: number;
  modifiersBreakdown?: ModifierSaleDetail[];
}

interface ProcessedModifierLineData {
  modifierId: number;
  modifierName: string;
  // Base values from current master data, for one unit of parent item
  baseUnitPrice: number; 
  baseHpp: number;
  // Calculated values for total quantity of parent item
  grossValueContribution: number; // (baseUnitPrice * quantity_parent_item)
  allocatedItemSpecificDiscount: number;
  valueAfterItemSpecificDiscount: number;
  totalHpp: number; // (baseHpp * quantity_parent_item)
  proRatedTrueOrderLevelDiscount: number;
}

interface ProcessedOrderItemData {
  orderId: number;
  orderItemId: number;
  menuId: number;
  menuName: string;
  menuCategory: string;
  quantity: number;

  // Kontribusi dari bagian menu utama saja
  menuPartBaseUnitPrice: number;
  menuPartBaseHpp: number; 
  menuPartGrossValue: number; // (menuPartBaseUnitPrice * quantity)
  menuPartAllocatedItemSpecificDiscount: number; // Portion of coi.discountAmount for the menu part
  menuPartValueAfterItemSpecificDiscount: number;
  menuPartTotalHpp: number; // (menuPartBaseHpp * quantity)
  proRatedTrueOrderLevelDiscountOnMenuPart: number;

  modifiers: ProcessedModifierLineData[];

  // Value of the entire line (menu + modifiers) AFTER item-specific discount, used for order-level discount distribution
  totalNetLineValueAfterItemSpecificDiscount: number;
}


function getStartAndEndDates(period: string, dateString?: string): { startDate: Date; endDate: Date } {
  const date = dateString ? new Date(dateString) : new Date();
  let startDate: Date;
  let endDate: Date;

  switch (period.toLowerCase()) {
    case "daily":
      startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);
      break;
    case "weekly": {
      const currentDay = date.getDay();
      const diffToMonday = date.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
      startDate = new Date(date.getFullYear(), date.getMonth(), diffToMonday);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      break;
    }
    case "monthly":
      startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      endDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      break;
    case "yearly":
      startDate = new Date(date.getFullYear(), 0, 1);
      endDate = new Date(date.getFullYear() + 1, 0, 1);
      break;
    default:
      throw new Error("Invalid period");
  }
  return { startDate, endDate };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "daily";
    const date = searchParams.get("date") || undefined;
    const startDateQuery = searchParams.get("startDate");
    const endDateQuery = searchParams.get("endDate");

    let startDate: Date;
    let endDate: Date;

    if (startDateQuery) {
      startDate = new Date(startDateQuery);
      endDate = endDateQuery ? new Date(endDateQuery) : new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      ({ startDate, endDate } = getStartAndEndDates(period, date));
    }

    const [orderRows] = await db.execute<RowDataPacket[]>(
      `
      WITH ModifierHPP AS (
          SELECT
              md.id as modifierId,
              SUM(COALESCE(ing.price, 0) * COALESCE(mi.amount, 0)) as modifierHppValue
          FROM modifier md 
          LEFT JOIN modifierIngredient mi ON md.id = mi.modifierId
          LEFT JOIN ingredient ing ON mi.ingredientId = ing.id
          GROUP BY md.id
      )
      SELECT 
          co.id AS orderId,
          co.discountAmount AS orderGrandTotalDiscountAmount,
          coi.id AS orderItemId,
          coi.quantity AS itemQuantity,
          coi.discountAmount AS itemSpecificTotalDiscountOnLine, 
          coi.price AS itemUnitPriceGrossCombined, 
          m.id AS menuId,
          m.name AS menuName,
          m.category AS menuCategory,
          m.price AS menuMasterUnitPrice, 
          m.hargaBakul AS menuMasterHpp,
          md.id AS modifierId,
          md.name AS modifierName,
          md.price AS modifierMasterUnitPrice, 
          mh.modifierHppValue AS modifierMasterHpp
      FROM completedOrder co
      JOIN completedOrderItem coi ON co.id = coi.orderId
      JOIN menu m ON coi.menuId = m.id
      LEFT JOIN completedOrderItemModifier coim ON coi.id = coim.completedOrderItemId
      LEFT JOIN modifier md ON coim.modifierId = md.id 
      LEFT JOIN ModifierHPP mh ON md.id = mh.modifierId 
      WHERE co.createdAt >= ? AND co.createdAt < ?
      ORDER BY co.id, coi.id, md.id 
      `,
      [startDate, endDate]
    );

    const itemDetailsMap = new Map<number, ProcessedOrderItemData>();
    const orderGrandTotalDiscounts = new Map<number, number>(); 
    const orderSumOfItemSpecificDiscountsOnLine = new Map<number, number>();

    const processedCoiForSumDiscount = new Set<number>(); 
    for (const row of orderRows) {
        const orderId = Number(row.orderId);
        const orderItemId = Number(row.orderItemId);
        
        orderGrandTotalDiscounts.set(orderId, Number(row.orderGrandTotalDiscountAmount || 0));

        if (!processedCoiForSumDiscount.has(orderItemId)) {
            const itemSpecificTotalDiscount = Number(row.itemSpecificTotalDiscountOnLine || 0);
            const currentSum = orderSumOfItemSpecificDiscountsOnLine.get(orderId) || 0;
            orderSumOfItemSpecificDiscountsOnLine.set(orderId, currentSum + itemSpecificTotalDiscount);
            processedCoiForSumDiscount.add(orderItemId);
        }
    }
    
    const orderTrueOrderLevelOnlyDiscounts = new Map<number,number>();
    orderGrandTotalDiscounts.forEach((grandTotalDiscount, orderId) => {
        const sumItemLineDiscounts = orderSumOfItemSpecificDiscountsOnLine.get(orderId) || 0;
        orderTrueOrderLevelOnlyDiscounts.set(orderId, Math.max(0, grandTotalDiscount - sumItemLineDiscounts));
    });

    for (const row of orderRows) {
      const orderId = Number(row.orderId);
      const orderItemId = Number(row.orderItemId);
      const quantity = Number(row.itemQuantity);
      const coiPriceUnitGrossCombined = Number(row.itemUnitPriceGrossCombined); 
      const coiTotalItemSpecificDiscountOnLine = Number(row.itemSpecificTotalDiscountOnLine); 

      if (!itemDetailsMap.has(orderItemId)) {
        itemDetailsMap.set(orderItemId, {
          orderId,
          orderItemId,
          menuId: Number(row.menuId),
          menuName: String(row.menuName),
          menuCategory: String(row.menuCategory),
          quantity,
          menuPartBaseUnitPrice: Number(row.menuMasterUnitPrice || 0),
          menuPartBaseHpp: Number(row.menuMasterHpp || 0),
          menuPartGrossValue: Number(row.menuMasterUnitPrice || 0) * quantity,
          menuPartTotalHpp: Number(row.menuMasterHpp || 0) * quantity,
          menuPartAllocatedItemSpecificDiscount: 0, // Initialized, calculated in Pass 1.5
          menuPartValueAfterItemSpecificDiscount: 0, // Initialized, calculated in Pass 1.5
          proRatedTrueOrderLevelDiscountOnMenuPart: 0,
          modifiers: [],
          totalNetLineValueAfterItemSpecificDiscount: (coiPriceUnitGrossCombined * quantity) - coiTotalItemSpecificDiscountOnLine,
        });
      }

      const currentItemData = itemDetailsMap.get(orderItemId)!;

      if (row.modifierId && !currentItemData.modifiers.find(m => m.modifierId === Number(row.modifierId))) {
        const modifierMasterUnitPrice = Number(row.modifierMasterUnitPrice || 0);
        const modifierMasterHpp = Number(row.modifierMasterHpp || 0);
        currentItemData.modifiers.push({
          modifierId: Number(row.modifierId),
          modifierName: String(row.modifierName),
          baseUnitPrice: modifierMasterUnitPrice,
          baseHpp: modifierMasterHpp,
          grossValueContribution: modifierMasterUnitPrice * quantity,
          totalHpp: modifierMasterHpp * quantity,
          allocatedItemSpecificDiscount: 0,
          valueAfterItemSpecificDiscount: 0, 
          proRatedTrueOrderLevelDiscount: 0,
        });
      }
    }
    
    const orderSubTotalsForDiscountDistribution = new Map<number, number>();

    itemDetailsMap.forEach(item => {
        let calculatedSumOfGrossParts = item.menuPartGrossValue;
        item.modifiers.forEach(mod => calculatedSumOfGrossParts += mod.grossValueContribution);
        
        const originalRowForOrderItem = orderRows.find(r => Number(r.orderItemId) === item.orderItemId);
        const coiTotalItemSpecificDiscountOnLine = originalRowForOrderItem ? Number(originalRowForOrderItem.itemSpecificTotalDiscountOnLine || 0) : 0;

        if (calculatedSumOfGrossParts > 0) {
            item.menuPartAllocatedItemSpecificDiscount = (item.menuPartGrossValue / calculatedSumOfGrossParts) * coiTotalItemSpecificDiscountOnLine;
            item.modifiers.forEach(mod => {
                mod.allocatedItemSpecificDiscount = (mod.grossValueContribution / calculatedSumOfGrossParts) * coiTotalItemSpecificDiscountOnLine;
            });
        } else { 
            item.menuPartAllocatedItemSpecificDiscount = 0;
            item.modifiers.forEach(mod => mod.allocatedItemSpecificDiscount = 0);
        }

        item.menuPartValueAfterItemSpecificDiscount = item.menuPartGrossValue - item.menuPartAllocatedItemSpecificDiscount;
        item.modifiers.forEach(mod => {
            mod.valueAfterItemSpecificDiscount = mod.grossValueContribution - mod.allocatedItemSpecificDiscount;
        });
        
        const currentOrderSubTotal = orderSubTotalsForDiscountDistribution.get(item.orderId) || 0;
        orderSubTotalsForDiscountDistribution.set(item.orderId, currentOrderSubTotal + item.totalNetLineValueAfterItemSpecificDiscount);
    });
    
    itemDetailsMap.forEach(item => {
      const trueOrderLevelDiscountForOrder = orderTrueOrderLevelOnlyDiscounts.get(item.orderId) || 0;
      const orderSubTotalBasis = orderSubTotalsForDiscountDistribution.get(item.orderId) || 0; 

      if (trueOrderLevelDiscountForOrder > 0 && orderSubTotalBasis > 0) {
        if (item.totalNetLineValueAfterItemSpecificDiscount > 0) { 
            const itemLineProportionOfOrder = item.totalNetLineValueAfterItemSpecificDiscount / orderSubTotalBasis;
            const discountForThisEntireLine = itemLineProportionOfOrder * trueOrderLevelDiscountForOrder;

            const internalBaseForDistribution = item.menuPartValueAfterItemSpecificDiscount + item.modifiers.reduce((sum, m) => sum + m.valueAfterItemSpecificDiscount, 0);
            
            if (internalBaseForDistribution > 0) {
                const menuPartProportionInternal = item.menuPartValueAfterItemSpecificDiscount / internalBaseForDistribution;
                const discountForMenuPart = menuPartProportionInternal * discountForThisEntireLine;
                item.proRatedTrueOrderLevelDiscountOnMenuPart = Math.min(discountForMenuPart, item.menuPartValueAfterItemSpecificDiscount);

                item.modifiers.forEach(modifier => {
                    const modifierProportionInternal = modifier.valueAfterItemSpecificDiscount / internalBaseForDistribution;
                    const discountForModifier = modifierProportionInternal * discountForThisEntireLine;
                    modifier.proRatedTrueOrderLevelDiscount = Math.min(discountForModifier, modifier.valueAfterItemSpecificDiscount);
                });
            }
        }
      }
    });

    const finalReportMap = new Map<number, ItemSalesResponse>();
    itemDetailsMap.forEach(processedItem => {
      const menuId = processedItem.menuId;
      if (!finalReportMap.has(menuId)) {
        finalReportMap.set(menuId, {
          menuId: menuId,
          menuName: processedItem.menuName,
          category: processedItem.menuCategory,
          quantity: 0,
          netSales: 0,
          hpp: 0,
          discount: 0,
          modifiersBreakdown: [],
        });
      }
      const reportItem = finalReportMap.get(menuId)!;
      
      reportItem.quantity += processedItem.quantity;

      const menuNetSales = processedItem.menuPartValueAfterItemSpecificDiscount - processedItem.proRatedTrueOrderLevelDiscountOnMenuPart;
      reportItem.netSales += menuNetSales;
      reportItem.hpp += processedItem.menuPartTotalHpp;
      reportItem.discount += processedItem.menuPartAllocatedItemSpecificDiscount + processedItem.proRatedTrueOrderLevelDiscountOnMenuPart;

      const modifierAggregatorForReport = new Map<number, ModifierSaleDetail>();

      processedItem.modifiers.forEach(mod => {
        const modNetSales = mod.valueAfterItemSpecificDiscount - mod.proRatedTrueOrderLevelDiscount;
        reportItem.netSales += modNetSales;
        reportItem.hpp += mod.totalHpp;
        reportItem.discount += mod.allocatedItemSpecificDiscount + mod.proRatedTrueOrderLevelDiscount;

        if (!modifierAggregatorForReport.has(mod.modifierId)) {
          modifierAggregatorForReport.set(mod.modifierId, {
            modifierId: mod.modifierId,
            modifierName: mod.modifierName,
            quantitySoldWithParentMenu: 0,
            netSalesFromThisModifier: 0,
            hppFromThisModifier: 0,
            discountAllocatedToThisModifier: 0,
          });
        }
        const aggMod = modifierAggregatorForReport.get(mod.modifierId)!;
        aggMod.quantitySoldWithParentMenu += processedItem.quantity;
        aggMod.netSalesFromThisModifier += modNetSales;
        aggMod.hppFromThisModifier += mod.totalHpp;
        aggMod.discountAllocatedToThisModifier += mod.allocatedItemSpecificDiscount + mod.proRatedTrueOrderLevelDiscount;
      });
      
      modifierAggregatorForReport.forEach(aggModDetail => {
          let existingBreakdown = reportItem.modifiersBreakdown!.find(b => b.modifierId === aggModDetail.modifierId);
          if (existingBreakdown) {
              existingBreakdown.quantitySoldWithParentMenu += aggModDetail.quantitySoldWithParentMenu;
              existingBreakdown.netSalesFromThisModifier += aggModDetail.netSalesFromThisModifier;
              existingBreakdown.hppFromThisModifier += aggModDetail.hppFromThisModifier;
              existingBreakdown.discountAllocatedToThisModifier += aggModDetail.discountAllocatedToThisModifier;
          } else {
              reportItem.modifiersBreakdown!.push(aggModDetail);
          }
      });
    });

    const result: ItemSalesResponse[] = Array.from(finalReportMap.values()).sort(
      (a, b) => b.netSales - a.netSales
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching item sales:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
