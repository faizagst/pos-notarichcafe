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
  baseUnitPrice: number;
  baseHpp: number;
  grossValueContribution: number;
  totalHpp: number;
}

interface ProcessedOrderItemData {
  orderId: number;
  orderItemId: number;
  menuId: number;
  menuName: string;
  menuCategory: string;
  quantity: number;

  menuPartBaseUnitPrice: number;
  menuPartBaseHpp: number;
  menuPartGrossValue: number;
  menuPartTotalHpp: number;

  modifiers: ProcessedModifierLineData[];

  lineGrossValue: number;
  lineNetSales: number;
  menuAllocatedDiscount: number;
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
          co.total AS orderFinalPrice,        
          co.discountAmount AS orderTotalDiscount, 
          coi.id AS orderItemId,
          coi.quantity AS itemQuantity,
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

    const orderAggregates = new Map<number, {
      orderFinalPrice: number;
      orderTotalDiscount: number;
      orderNetSales: number;
      orderGrossValueFromItems: number;
    }>();

    const processedOrderIdsForAggregates = new Set<number>();
    const processedOrderItemIdsForGrossValue = new Set<number>();

    for (const row of orderRows) {
      const orderId = Number(row.orderId);

      if (!processedOrderIdsForAggregates.has(orderId)) {
        const finalPrice = Number(row.orderFinalPrice || 0);
        const totalDiscount = Number(row.orderTotalDiscount || 0);
        orderAggregates.set(orderId, {
          orderFinalPrice: finalPrice,
          orderTotalDiscount: totalDiscount,
          orderNetSales: finalPrice - totalDiscount,
          orderGrossValueFromItems: 0,
        });
        processedOrderIdsForAggregates.add(orderId);
      }

      const orderItemId = Number(row.orderItemId);
      if(!processedOrderItemIdsForGrossValue.has(orderItemId)) {
        const orderData = orderAggregates.get(orderId)!;
        orderData.orderGrossValueFromItems += Number(row.itemUnitPriceGrossCombined || 0) * Number(row.itemQuantity || 0);
        processedOrderItemIdsForGrossValue.add(orderItemId);
      }
    }
    
    const itemDetailsMap = new Map<number, ProcessedOrderItemData>();

    for (const row of orderRows) {
      const orderId = Number(row.orderId);
      const orderItemId = Number(row.orderItemId);
      const quantity = Number(row.itemQuantity);
      const itemUnitPriceGrossCombined = Number(row.itemUnitPriceGrossCombined || 0);

      if (!itemDetailsMap.has(orderItemId)) {
        const menuMasterUnitPrice = Number(row.menuMasterUnitPrice || 0);
        const menuMasterHpp = Number(row.menuMasterHpp || 0);
        
        itemDetailsMap.set(orderItemId, {
          orderId,
          orderItemId,
          menuId: Number(row.menuId),
          menuName: String(row.menuName),
          menuCategory: String(row.menuCategory),
          quantity,
          menuPartBaseUnitPrice: menuMasterUnitPrice,
          menuPartBaseHpp: menuMasterHpp,
          menuPartGrossValue: menuMasterUnitPrice * quantity,
          menuPartTotalHpp: menuMasterHpp * quantity,
          modifiers: [],
          lineGrossValue: itemUnitPriceGrossCombined * quantity,
          lineNetSales: 0,
          menuAllocatedDiscount: 0,
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
        });
      }
    }

    itemDetailsMap.forEach(item => {
      const orderData = orderAggregates.get(item.orderId);
      
      if (!orderData) {
        console.warn(`Order data not found for orderId: ${item.orderId}. Item ${item.orderItemId} will use gross values.`);
        item.lineNetSales = item.lineGrossValue;
        item.menuAllocatedDiscount = 0;
        return;
      }

      if (orderData.orderGrossValueFromItems > 0) {
        const proportion = item.lineGrossValue / orderData.orderGrossValueFromItems;
        item.lineNetSales = proportion * orderData.orderNetSales;
        item.menuAllocatedDiscount = proportion * orderData.orderTotalDiscount;
      } else {
        if (item.lineGrossValue > 0) {
           // Should not happen if item.lineGrossValue contributes to orderData.orderGrossValueFromItems
           console.warn(`Item line ${item.orderItemId} has gross value but order sum is zero. Using item gross value.`);
           item.lineNetSales = item.lineGrossValue;
           item.menuAllocatedDiscount = 0;
        } else {
            // Item line and order sum are both zero gross. Net sales and discount are zero for the line.
            // Any order-level net sales/discount is not attributable to this zero-value item.
            item.lineNetSales = 0;
            item.menuAllocatedDiscount = 0;
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
      reportItem.netSales += processedItem.lineNetSales;
      reportItem.hpp += processedItem.menuPartTotalHpp;
      reportItem.discount += processedItem.menuAllocatedDiscount;

      const modifierAggregatorForReportLine = new Map<number, ModifierSaleDetail>();

      processedItem.modifiers.forEach(mod => {
        reportItem.hpp += mod.totalHpp;

        if (!modifierAggregatorForReportLine.has(mod.modifierId)) {
          modifierAggregatorForReportLine.set(mod.modifierId, {
            modifierId: mod.modifierId,
            modifierName: mod.modifierName,
            quantitySoldWithParentMenu: 0,
            netSalesFromThisModifier: 0,
            hppFromThisModifier: 0,
            discountAllocatedToThisModifier: 0, 
          });
        }
        const aggMod = modifierAggregatorForReportLine.get(mod.modifierId)!;
        aggMod.quantitySoldWithParentMenu += processedItem.quantity;
        aggMod.netSalesFromThisModifier += mod.grossValueContribution; 
        aggMod.hppFromThisModifier += mod.totalHpp;
      });

      modifierAggregatorForReportLine.forEach(aggModDetail => {
        let existingBreakdown = reportItem.modifiersBreakdown!.find(b => b.modifierId === aggModDetail.modifierId);
        if (existingBreakdown) {
          existingBreakdown.quantitySoldWithParentMenu += aggModDetail.quantitySoldWithParentMenu;
          existingBreakdown.netSalesFromThisModifier += aggModDetail.netSalesFromThisModifier;
          existingBreakdown.hppFromThisModifier += aggModDetail.hppFromThisModifier;
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