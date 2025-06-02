import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { RowDataPacket } from "mysql2";

interface DetailItem {
  orderId: number;
  orderDate: string;
  menuName: string;
  sellingPrice: number;
  quantity: number;
  itemTotalSelling: number;
  hpp: number;
  itemTotalHPP: number;
}

interface GrossProfitResponse {
  summary: {
    explanation: string;
    grossSales: number;
    discounts: number;
    refunds: number;
    netSales: number;
    grossProfit: number;
    cogs: number;
  };
  details: DetailItem[];
  ordersCount: number;
  startDate: string;
  endDate: string;
}

function getStartAndEndDates(period: string, dateString: string) {
  const date = new Date(dateString);
  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case "daily":
      startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);
      break;
    case "weekly": {
      const day = date.getDay();
      const diff = date.getDate() - (day === 0 ? 6 : day - 1);
      startDate = new Date(date.getFullYear(), date.getMonth(), diff);
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
    const dateParam = searchParams.get("date");
    const startDateQuery = searchParams.get("startDate");
    const endDateQuery = searchParams.get("endDate");

    let startDate: Date;
    let endDate: Date;

    if (startDateQuery) {
      startDate = new Date(startDateQuery);
      endDate = endDateQuery ? new Date(endDateQuery) : new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      const dateStr = dateParam || new Date().toISOString();
      ({ startDate, endDate } = getStartAndEndDates(period, dateStr));
    }

    // Ambil gross sales dan discount langsung dari completedOrder
    const [orders] = await db.execute<RowDataPacket[]>(
      `
      SELECT id, total, discountAmount
      FROM completedOrder
      WHERE createdAt >= ? AND createdAt < ?
      `,
      [startDate, endDate]
    );

    let totalGrossSales = 0;
    let totalDiscounts = 0;

    for (const row of orders) {
      totalGrossSales += Number(row.total || 0);
      totalDiscounts += Number(row.discountAmount || 0);
    }

    // Ambil detail item dan modifier untuk COGS (HPP)
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
        co.id as orderId, 
        co.createdAt as orderDate,
        coi.id as orderItemId,
        coi.quantity,
        m.name as menuName,
        m.price as menuSellingPrice,
        m.hargaBakul as menuHpp,
        md.id as modifierId,      
        md.price as modifierSellingPrice,
        md.name as modifierName,
        mh.modifierHppValue
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

    const aggregatedDetails: Record<string, DetailItem> = {};
    let totalCogs = 0;
    const orderIdSet = new Set<number>();

    for (const row of orderRows) {
      const orderId = Number(row.orderId);
      const orderItemId = Number(row.orderItemId);
      const quantity = Number(row.quantity);
      const baseMenuHpp = Number(row.menuHpp);
      const modifierHpp = Number(row.modifierHppValue || 0);

      orderIdSet.add(orderId);

      if (!aggregatedDetails[orderItemId]) {
        aggregatedDetails[orderItemId] = {
          orderId,
          orderDate: new Date(row.orderDate).toISOString(),
          menuName: row.menuName,
          sellingPrice: Number(row.menuSellingPrice),
          quantity,
          itemTotalSelling: Number(row.menuSellingPrice) * quantity,
          hpp: baseMenuHpp,
          itemTotalHPP: baseMenuHpp * quantity,
        };
        totalCogs += baseMenuHpp * quantity;
      }

      if (row.modifierId) {
        aggregatedDetails[orderItemId].hpp += modifierHpp;
        aggregatedDetails[orderItemId].itemTotalHPP += modifierHpp * quantity;
        totalCogs += modifierHpp * quantity;
      }
    }

    const refunds = 0;
    const netSales = totalGrossSales - totalDiscounts - refunds;
    const grossProfit = netSales - totalCogs;

    const reportEndDate = new Date(endDate);
    reportEndDate.setDate(reportEndDate.getDate() - 1);

    const response: GrossProfitResponse = {
      summary: {
        explanation:
          "Gross Sales: Total pendapatan dari co.total. COGS: Total HPP item dan modifier. Discounts: Total diskon dari co.discountAmount. Refunds diasumsikan 0. Net Sales = Gross - Discounts. Gross Profit = Net - COGS.",
        grossSales: totalGrossSales,
        discounts: totalDiscounts,
        refunds,
        netSales,
        cogs: totalCogs,
        grossProfit,
      },
      details: Object.values(aggregatedDetails),
      ordersCount: orderIdSet.size,
      startDate: startDate.toISOString(),
      endDate: reportEndDate.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in GET gross-profit:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
