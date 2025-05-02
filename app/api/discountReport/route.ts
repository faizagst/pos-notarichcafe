import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

interface DiscountReportResponse {
  name: string;
  discount: string;
  count: number;
  grossDiscount: number;
}

function getStartAndEndDates(period: string, dateString: string): { startDate: Date; endDate: Date } {
  const date = new Date(dateString);
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
    const url = new URL(req.url);
    const period = url.searchParams.get('period') || "daily";
    const date = url.searchParams.get('date');
    const startDateQuery = url.searchParams.get('startDate');
    const endDateQuery = url.searchParams.get('endDate');
    const formatCurrency = (num: number): string => "Rp " + num.toLocaleString("id-ID");

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

    const [rows]: any = await db.execute(
      `SELECT co.id AS orderId, co.discountId, co.discountAmount AS totalDiscount, co.createdAt,
              IFNULL(d.name, 'Diskon Manual') AS discountName,
              IFNULL(d.value, co.discountAmount) AS value,
              d.type,
              (
                SELECT IFNULL(SUM(coi.discountAmount), 0)
                FROM completedOrderItem coi
                WHERE coi.orderId = co.id
              ) AS itemDiscount
       FROM completedOrder co
       LEFT JOIN discount d ON co.discountId = d.id
       WHERE co.createdAt BETWEEN ? AND ?
         AND (co.discountId IS NOT NULL OR co.discountAmount > 0)`,
      [startDate, endDate]
    );

    const aggregated: Record<string, DiscountReportResponse> = {};

    for (const row of rows) {
      const itemDiscount = Number(row.itemDiscount) || 0;
      const totalDiscount = Number(row.totalDiscount) || 0;

      const cashierDiscount = totalDiscount - itemDiscount;

      // 1. Diskon Menu (manual)
      if (itemDiscount > 0) {
        if (!aggregated["menu"]) {
          aggregated["menu"] = {
            name: "Diskon Menu",
            discount: "-",
            count: 0,
            grossDiscount: 0,
          };
        }
        aggregated["menu"].count += 1;
        aggregated["menu"].grossDiscount += itemDiscount;
      }

      // 2. Diskon Kasir (dari discountId)
      if (row.discountId && cashierDiscount > 0) {
        const key = row.discountId.toString();
        if (!aggregated[key]) {
          aggregated[key] = {
            name: row.discountName,
            discount: row.type === "PERCENTAGE" ? `${row.value}%` : formatCurrency(Number(row.value)),
            count: 0,
            grossDiscount: 0,
          };
        }
        aggregated[key].count += 1;
        aggregated[key].grossDiscount += cashierDiscount;
      }
    }

    const result = Object.values(aggregated).sort((a, b) => b.grossDiscount - a.grossDiscount);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error in discount-report API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
