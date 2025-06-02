import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { RowDataPacket } from "mysql2";

interface CategorySalesResponse {
  category: string;
  itemSold: number;
  grossSales: number;
  discount: number;
  netSales: number;
  cogs: number;
  grossProfit: number;
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

    const [rows] = await db.execute<RowDataPacket[]>(
      `
      WITH ModifierHPPUnit AS (
        SELECT
          md.id AS modifierId,
          SUM(COALESCE(ing.price, 0) * COALESCE(mi.amount, 0)) AS modifierHppValue
        FROM modifier md
        LEFT JOIN modifierIngredient mi ON md.id = mi.modifierId
        LEFT JOIN ingredient ing ON mi.ingredientId = ing.id
        GROUP BY md.id
      ),
      ItemWithCOGS AS (
        SELECT
          coi.id AS itemId,
          co.id AS orderId,
          co.total AS orderTotal,
          co.discountAmount AS orderDiscount,
          m.category AS category,
          coi.quantity,
          coi.price AS itemPrice,
          COALESCE(m.hargaBakul, 0) AS menuHPP,
          SUM(COALESCE(mhu.modifierHppValue, 0)) AS modifierHPP
        FROM completedOrderItem coi
        JOIN completedOrder co ON co.id = coi.orderId
        JOIN menu m ON coi.menuId = m.id
        LEFT JOIN completedOrderItemModifier coim ON coi.id = coim.completedOrderItemId
        LEFT JOIN ModifierHPPUnit mhu ON coim.modifierId = mhu.modifierId
        WHERE co.createdAt >= ? AND co.createdAt < ?
        GROUP BY coi.id
      ),
      Aggregated AS (
        SELECT
          iwc.orderId,
          iwc.orderTotal,
          iwc.orderDiscount,
          iwc.category,
          iwc.quantity,
          iwc.itemPrice,
          iwc.menuHPP,
          iwc.modifierHPP,
          iwc.quantity * iwc.itemPrice AS itemGrossSales,
          iwc.quantity * iwc.menuHPP AS itemMenuCOGS,
          iwc.quantity * iwc.modifierHPP AS itemModifierCOGS
        FROM ItemWithCOGS iwc
      )
      SELECT 
        ag.orderId,
        ag.orderTotal,
        ag.orderDiscount,
        ag.category,
        ag.quantity,
        ag.itemGrossSales,
        ag.itemMenuCOGS,
        ag.itemModifierCOGS
      FROM Aggregated ag
      `,
      [startDate, endDate]
    );

    // Per-order aggregation for grossSales and discount distribution
    const orderTotals = new Map<
      number,
      { total: number; discount: number; items: RowDataPacket[] }
    >();

    for (const row of rows) {
      const orderId = Number(row.orderId);
      if (!orderTotals.has(orderId)) {
        orderTotals.set(orderId, {
          total: Number(row.orderTotal),
          discount: Number(row.orderDiscount || 0),
          items: [row],
        });
      } else {
        orderTotals.get(orderId)!.items.push(row);
      }
    }

    const reportMap = new Map<string, CategorySalesResponse>();

    for (const [_, { total, discount, items }] of orderTotals) {
      const orderGrossSum = items.reduce((sum, item) => sum + Number(item.itemGrossSales), 0);

      for (const item of items) {
        const category = String(item.category);
        const quantity = Number(item.quantity || 0);
        const itemGross = Number(item.itemGrossSales || 0);
        const menuCogs = Number(item.itemMenuCOGS || 0);
        const modifierCogs = Number(item.itemModifierCOGS || 0);
        const cogs = menuCogs + modifierCogs;

        const grossSales = (itemGross / orderGrossSum) * total;
        const proportionalDiscount = (itemGross / orderGrossSum) * discount;
        const netSales = grossSales - proportionalDiscount;
        const grossProfit = netSales - cogs;

        if (!reportMap.has(category)) {
          reportMap.set(category, {
            category,
            itemSold: quantity,
            grossSales,
            discount: proportionalDiscount,
            netSales,
            cogs,
            grossProfit,
          });
        } else {
          const data = reportMap.get(category)!;
          data.itemSold += quantity;
          data.grossSales += grossSales;
          data.discount += proportionalDiscount;
          data.netSales += netSales;
          data.cogs += cogs;
          data.grossProfit += grossProfit;
        }
      }
    }

    const result = Array.from(reportMap.values()).sort((a, b) => b.netSales - a.netSales);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error generating category sales report:", error);
    return NextResponse.json({ error: "Internal server error", message: error.message }, { status: 500 });
  }
}
