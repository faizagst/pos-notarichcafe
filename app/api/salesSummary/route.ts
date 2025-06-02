import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "daily";
    const date = searchParams.get("date");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let startDate: Date;
    let endDate: Date;

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

    if (startDateParam) {
      startDate = new Date(startDateParam);
      endDate = endDateParam ? new Date(endDateParam) : new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      const dateString = date || new Date().toISOString();
      ({ startDate, endDate } = getStartAndEndDates(period, dateString));
    }

    const [ordersData] = await db.execute(
      `
      SELECT 
        co.id AS order_id,
        co.total,
        co.discountAmount,
        co.taxAmount,
        co.gratuityAmount,
        co.roundingAmount
      FROM completedOrder co
      WHERE co.createdAt >= ? AND co.createdAt < ?
      `,
      [startDate, endDate]
    );

    type OrderRow = {
      order_id: number;
      total: string | number | null;
      discountAmount: string | number | null;
      taxAmount: string | number | null;
      gratuityAmount: string | number | null;
      roundingAmount: string | number | null;
    };

    let grossSales = 0;
    let discounts = 0;
    let tax = 0;
    let gratuity = 0;
    let totalRoundingFromOrders = 0;

    for (const row of ordersData as OrderRow[]) {
      grossSales += Number(row.total || 0);
      discounts += Number(row.discountAmount || 0);
      tax += Number(row.taxAmount || 0);
      gratuity += Number(row.gratuityAmount || 0);
      totalRoundingFromOrders += Number(row.roundingAmount || 0);
    }

    const refunds = 0;
    const netSales = grossSales - discounts - refunds;
    const rounding = totalRoundingFromOrders;
    const totalCollected = netSales + tax + gratuity + rounding;

    const response = {
      grossSales,
      discounts,
      refunds,
      netSales,
      gratuity,
      tax,
      rounding,
      totalCollected,
      ordersCount: (ordersData as OrderRow[]).length,
      startDate: startDate.toISOString(),
      reportEndDate: new Date(endDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in GET sales-summary:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
