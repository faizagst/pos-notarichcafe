import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

interface Metrics {
  totalSales: number;
  transactions: number;
  grossProfit: number;
  netProfit: number;
  discounts: number;
  tax: number;
  gratuity: number;
}

function getStartAndEndDates(period: string, dateString: string): { startDate: Date; endDate: Date } {
  const date = new Date(dateString);
  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case "daily":
    case "daily-prev":
      startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);
      break;
    case "weekly":
    case "weekly-prev":
      const day = date.getDay();
      const diff = date.getDate() - (day === 0 ? 6 : day - 1);
      startDate = new Date(date.getFullYear(), date.getMonth(), diff);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      break;
    case "monthly":
    case "monthly-prev":
      startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      endDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      break;
    case "yearly":
    case "yearly-prev":
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
    const dateParam = searchParams.get("date") || new Date().toISOString();
    const { startDate, endDate } = getStartAndEndDates(period, dateParam);

    const [orders] = await db.execute(
      `
      SELECT 
        o.id,
        o.createdAt,
        o.total,
        o.discountAmount,
        o.taxAmount,
        o.gratuityAmount,
        o.finalTotal,
        oi.id AS orderItemId,
        oi.quantity,
        oi.price AS itemPrice,
        oi.discountAmount AS itemDiscount,
        m.id AS menuId,
        m.name AS menuName,
        m.price AS menuPrice,
        m.hargaBakul AS menuHargaBakul
      FROM completedOrder o
      LEFT JOIN completedOrderItem oi ON oi.orderId = o.id
      LEFT JOIN menu m ON m.id = oi.menuId
      WHERE o.createdAt >= ? AND o.createdAt < ?
      `,
      [startDate, endDate]
    );

    type Row = {
      id: number;
      createdAt: Date;
      total: number;
      discountAmount: number;
      taxAmount: number;
      gratuityAmount: number;
      finalTotal: number;
      orderItemId: number | null;
      quantity: number | null;
      itemPrice: number | null;
      itemDiscount: number | null;
      menuId: number | null;
      menuName: string | null;
      menuPrice: number | null;
      menuHargaBakul: number | null;
    };

    const rows = orders as Row[];

    const orderMap = new Map<number, Row[]>();
    for (const row of rows) {
      if (!orderMap.has(row.id)) {
        orderMap.set(row.id, []);
      }
      orderMap.get(row.id)!.push(row);
    }

    let totalSales = 0;
    let grossProfit = 0;
    let discounts = 0;
    let tax = 0;
    let gratuity = 0;

    for (const [orderId, items] of orderMap.entries()) {
      const order = items[0];
      totalSales += Number(order.finalTotal ?? 0);
      discounts += Number(order.discountAmount ?? 0);
      tax += Number(order.taxAmount ?? 0);
      gratuity += Number(order.gratuityAmount ?? 0);

      for (const item of items) {
        if (item.quantity && item.menuPrice !== null && item.menuHargaBakul !== null) {
          const margin = (Number(item.menuPrice)- Number(item.discountAmount) - Number(item.menuHargaBakul)) * item.quantity;
          grossProfit += margin;
        }
      }
    }

    const netProfit = grossProfit - tax - gratuity;

    const response: Metrics = {
      totalSales,
      transactions: orderMap.size,
      grossProfit,
      netProfit,
      discounts,
      tax,
      gratuity,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching sales metrics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
