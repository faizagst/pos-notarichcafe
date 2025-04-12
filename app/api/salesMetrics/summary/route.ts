import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

interface SalesSummaryResponse {
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  gratuity: number;
  tax: number;
  rounding: number;
  totalCollected: number;
  ordersCount: number;
  startDate: string;
  endDate: string;
}

function getStartAndEndDates(period: string, dateString: string): { startDate: Date; endDate: Date } {
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
    const date = searchParams.get("date");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let startDate: Date;
    let endDate: Date;

    if (startDateParam) {
      startDate = new Date(startDateParam);
      endDate = endDateParam ? new Date(endDateParam) : new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      const dateString = date || new Date().toISOString();
      ({ startDate, endDate } = getStartAndEndDates(period, dateString));
    }

    const [orders] = await db.execute(
      `
      SELECT 
        o.id,
        o.discountAmount,
        o.taxAmount,
        o.gratuityAmount,
        m.price AS menuPrice,
        m.hargaBakul AS menuHargaBakul,
        oi.quantity
      FROM completedOrder o
      LEFT JOIN completedOrderItem oi ON o.id = oi.orderId
      LEFT JOIN menu m ON oi.menuId = m.id
      WHERE o.createdAt >= ? AND o.createdAt < ?
      `,
      [startDate, endDate]
    );

    const typedOrders = orders as {
      id: number;
      discountAmount: number | null;
      taxAmount: number | null;
      gratuityAmount: number | null;
      menuPrice: number | null;
      menuHargaBakul: number | null;
      quantity: number | null;
    }[];

    const grossSales = typedOrders.reduce((acc, item) => {
      const price = Number(item.menuPrice || 0);
      const hpp = Number(item.menuHargaBakul || 0);
      const qty = Number(item.quantity || 0);
      return acc + (price - hpp) * qty;
    }, 0);

    const discounts = typedOrders.reduce((acc, item) => acc + Number(item.discountAmount || 0), 0);
    const tax = typedOrders.reduce((acc, item) => acc + Number(item.taxAmount || 0), 0);
    const gratuity = typedOrders.reduce((acc, item) => acc + Number(item.gratuityAmount || 0), 0);

    const refunds = 0;
    const netSales = grossSales - discounts - refunds;

    const remainder = netSales % 100;
    const rounding = remainder === 0 ? 0 : 100 - remainder;

    const totalCollected = netSales + gratuity + tax + rounding;

    const orderIds = new Set(typedOrders.map((o) => o.id));
    const ordersCount = orderIds.size;

    const response: SalesSummaryResponse = {
      grossSales,
      discounts,
      refunds,
      netSales,
      gratuity,
      tax,
      rounding,
      totalCollected,
      ordersCount,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in sales-summary:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
