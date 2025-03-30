import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// Interface untuk respons API
interface PaymentMethodStats {
  paymentMethod: string;
  count: number;
  totalRevenue: number;
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
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(date.setDate(diff));
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
    const startDateQuery = searchParams.get("startDate");
    const endDateQuery = searchParams.get("endDate");

    let startDate: Date;
    let endDate: Date;

    if (startDateQuery) {
      startDate = new Date(startDateQuery);
      endDate = endDateQuery ? new Date(endDateQuery) : new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      const dateStr = date || new Date().toISOString();
      ({ startDate, endDate } = getStartAndEndDates(period, dateStr));
    }

    const query = `
      SELECT paymentMethod, COUNT(paymentMethod) AS count, SUM(total) AS totalRevenue
      FROM completedOrder
      WHERE createdAt >= ? AND createdAt < ? AND paymentMethod IS NOT NULL
      GROUP BY paymentMethod
      ORDER BY count DESC;
    `;

    const [rows] = await db.execute(query, [startDate, endDate]);

    const formattedResult: PaymentMethodStats[] = (rows as any[]).map((item) => ({
      paymentMethod: item.paymentMethod || "Unknown",
      count: item.count,
      totalRevenue: item.totalRevenue || 0,
    }));

    return NextResponse.json(formattedResult);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
