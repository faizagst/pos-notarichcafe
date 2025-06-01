import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { RowDataPacket } from "mysql2";

// Interface untuk respons API per kategori
interface CategorySalesResponse {
  category: string;
  itemSold: number;       // Total kuantitas item utama terjual dalam kategori ini
  grossSales: number;     // Total penjualan kotor (menu + modifier) sebelum diskon apapun
  discount: number;       // Total diskon (item-specific + pro-rata order-level)
  netSales: number;       // grossSales - discount
  cogs: number;           // Total HPP (menu + modifier)
  grossProfit: number;    // netSales - cogs
}

// Interface untuk memproses data modifier dalam satu baris item pesanan
interface ProcessedModifierLineData {
  modifierId: number;
  modifierName: string;
  baseUnitPrice: number; // Ditambahkan - Harga satuan dasar modifier dari master
  baseHpp: number;       // Harga satuan dasar HPP modifier dari master
  // Berdasarkan data master, untuk satu unit item induk, lalu dikalikan kuantitas item induk
  grossValueFromMaster: number; // (modifierMasterUnitPrice * quantity_parent_item)
  hppFromMaster: number;        // (modifierMasterHpp * quantity_parent_item)
  
  allocatedItemSpecificDiscount: number; // Bagian dari coi.discountAmount untuk modifier ini
  proRatedTrueOrderLevelDiscount: number;  // Bagian dari diskon order-level murni untuk modifier ini
}

// Interface untuk memproses data satu baris item pesanan (completedOrderItem)
interface ProcessedOrderItemData {
  orderId: number;
  orderItemId: number;
  menuId: number;
  menuName: string;
  menuCategory: string;
  quantity: number; // Kuantitas item menu utama (induk)
  
  // Untuk bagian menu utama dari baris ini, berdasarkan data master
  menuPartBaseUnitPrice: number; 
  menuPartBaseHpp: number;       
  menuPartGrossValueFromMaster: number; 
  menuPartHppFromMaster: number;        
  menuPartAllocatedItemSpecificDiscount: number; 
  proRatedTrueOrderLevelDiscountOnMenuPart: number; 

  modifiers: ProcessedModifierLineData[]; 

  coiLineItemSpecificTotalDiscount: number; 
  lineNetValueAfterItemSpecificDiscountForOrderLevelDistribution: number; 
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
      WITH ModifierHPPUnit AS (
          SELECT
              md.id as modifierId,
              SUM(COALESCE(ing.price, 0) * COALESCE(mi.amount, 0)) as modifierHppValue -- Alias yang benar
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
          mh.modifierHppValue AS modifierMasterHpp -- Menggunakan alias yang benar dari CTE
      FROM completedOrder co
      JOIN completedOrderItem coi ON co.id = coi.orderId
      JOIN menu m ON coi.menuId = m.id
      LEFT JOIN completedOrderItemModifier coim ON coi.id = coim.completedOrderItemId
      LEFT JOIN modifier md ON coim.modifierId = md.id 
      LEFT JOIN ModifierHPPUnit mh ON md.id = mh.modifierId 
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
          menuPartGrossValueFromMaster: Number(row.menuMasterUnitPrice || 0) * quantity,
          menuPartHppFromMaster: Number(row.menuMasterHpp || 0) * quantity,
          menuPartAllocatedItemSpecificDiscount: 0,
          proRatedTrueOrderLevelDiscountOnMenuPart: 0,
          modifiers: [],
          coiLineItemSpecificTotalDiscount: coiTotalItemSpecificDiscountOnLine,
          lineNetValueAfterItemSpecificDiscountForOrderLevelDistribution: (coiPriceUnitGrossCombined * quantity) - coiTotalItemSpecificDiscountOnLine,
        });
      }

      const currentItemData = itemDetailsMap.get(orderItemId)!;

      if (row.modifierId && !currentItemData.modifiers.find(m => m.modifierId === Number(row.modifierId))) {
        const modifierMasterUnitPrice = Number(row.modifierMasterUnitPrice || 0);
        const modifierMasterHpp = Number(row.modifierMasterHpp || 0); // Diambil dari mh.modifierHppValue
        currentItemData.modifiers.push({
          modifierId: Number(row.modifierId),
          modifierName: String(row.modifierName),
          baseUnitPrice: modifierMasterUnitPrice, // Properti yang benar ditambahkan ke interface
          baseHpp: modifierMasterHpp,
          grossValueFromMaster: modifierMasterUnitPrice * quantity,
          hppFromMaster: modifierMasterHpp * quantity,
          allocatedItemSpecificDiscount: 0,
          proRatedTrueOrderLevelDiscount: 0,
        });
      }
    }
    
    const orderSubTotalsForDiscountDistribution = new Map<number, number>();
    itemDetailsMap.forEach(item => {
        let calculatedSumOfGrossPartsFromMasters = item.menuPartGrossValueFromMaster;
        item.modifiers.forEach(mod => calculatedSumOfGrossPartsFromMasters += mod.grossValueFromMaster);

        const lineItemSpecificDiscount = item.coiLineItemSpecificTotalDiscount;

        if (calculatedSumOfGrossPartsFromMasters > 0) {
            item.menuPartAllocatedItemSpecificDiscount = (item.menuPartGrossValueFromMaster / calculatedSumOfGrossPartsFromMasters) * lineItemSpecificDiscount;
            item.modifiers.forEach(mod => {
                mod.allocatedItemSpecificDiscount = (mod.grossValueFromMaster / calculatedSumOfGrossPartsFromMasters) * lineItemSpecificDiscount;
            });
        } else { 
            item.menuPartAllocatedItemSpecificDiscount = 0; 
            if (item.menuPartGrossValueFromMaster === 0 && calculatedSumOfGrossPartsFromMasters === 0 && item.modifiers.length === 0) {
            }
            item.modifiers.forEach(mod => mod.allocatedItemSpecificDiscount = 0);
        }
        
        const currentOrderSubTotal = orderSubTotalsForDiscountDistribution.get(item.orderId) || 0;
        orderSubTotalsForDiscountDistribution.set(item.orderId, currentOrderSubTotal + item.lineNetValueAfterItemSpecificDiscountForOrderLevelDistribution);
    });
    
    itemDetailsMap.forEach(item => {
      const trueOrderLevelDiscountForOrder = orderTrueOrderLevelOnlyDiscounts.get(item.orderId) || 0;
      const orderSubTotalBasis = orderSubTotalsForDiscountDistribution.get(item.orderId) || 0;

      if (trueOrderLevelDiscountForOrder > 0 && orderSubTotalBasis > 0) {
        const menuPartValueAfterItemDiscount = item.menuPartGrossValueFromMaster - item.menuPartAllocatedItemSpecificDiscount;
        let internalBaseForDistribution = menuPartValueAfterItemDiscount;
        item.modifiers.forEach(mod => {
            internalBaseForDistribution += (mod.grossValueFromMaster - mod.allocatedItemSpecificDiscount);
        });

        if (item.lineNetValueAfterItemSpecificDiscountForOrderLevelDistribution > 0 && internalBaseForDistribution > 0) { 
            const itemLineProportionOfOrder = item.lineNetValueAfterItemSpecificDiscountForOrderLevelDistribution / orderSubTotalBasis;
            const discountForThisEntireLine = itemLineProportionOfOrder * trueOrderLevelDiscountForOrder;
            
            const menuPartProportionInternal = menuPartValueAfterItemDiscount / internalBaseForDistribution;
            const discountForMenuPart = menuPartProportionInternal * discountForThisEntireLine;
            item.proRatedTrueOrderLevelDiscountOnMenuPart = Math.min(discountForMenuPart, menuPartValueAfterItemDiscount);

            item.modifiers.forEach(modifier => {
                const modifierValueAfterItemDiscount = modifier.grossValueFromMaster - modifier.allocatedItemSpecificDiscount;
                const modifierProportionInternal = modifierValueAfterItemDiscount / internalBaseForDistribution;
                const discountForModifier = modifierProportionInternal * discountForThisEntireLine;
                modifier.proRatedTrueOrderLevelDiscount = Math.min(discountForModifier, modifierValueAfterItemDiscount);
            });
        }
      }
    });

    const finalReportMap = new Map<string, CategorySalesResponse>();
    itemDetailsMap.forEach(processedItem => {
      const category = processedItem.menuCategory;
      if (!finalReportMap.has(category)) {
        finalReportMap.set(category, {
          category: category,
          itemSold: 0,
          grossSales: 0,
          discount: 0,
          netSales: 0,
          cogs: 0,
          grossProfit: 0,
        });
      }
      const reportCategoryData = finalReportMap.get(category)!;
      
      reportCategoryData.itemSold += processedItem.quantity;

      let currentLineGrossSales = processedItem.menuPartGrossValueFromMaster;
      processedItem.modifiers.forEach(mod => currentLineGrossSales += mod.grossValueFromMaster);
      reportCategoryData.grossSales += currentLineGrossSales;

      let currentLineCogs = processedItem.menuPartHppFromMaster;
      processedItem.modifiers.forEach(mod => currentLineCogs += mod.hppFromMaster);
      reportCategoryData.cogs += currentLineCogs;
      
      let currentLineTotalDiscount = processedItem.menuPartAllocatedItemSpecificDiscount + processedItem.proRatedTrueOrderLevelDiscountOnMenuPart;
      processedItem.modifiers.forEach(mod => {
          currentLineTotalDiscount += mod.allocatedItemSpecificDiscount + mod.proRatedTrueOrderLevelDiscount;
      });
      reportCategoryData.discount += currentLineTotalDiscount;
    });

    finalReportMap.forEach(categoryData => {
        categoryData.netSales = categoryData.grossSales - categoryData.discount;
        categoryData.grossProfit = categoryData.netSales - categoryData.cogs;
    });

    const result: CategorySalesResponse[] = Array.from(finalReportMap.values()).sort(
      (a, b) => b.netSales - a.netSales
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching category sales:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
