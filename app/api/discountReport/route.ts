import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// Interface untuk respons API
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

    console.log("Fetching discount data for period:", { startDate, endDate });
    
    const [orders]:any = await db.execute(
      `SELECT co.id, co.discountId, co.discountAmount, co.createdAt, 
              IFNULL(d.name, 'Manual Discount') AS discountName, 
              IFNULL(d.value, co.discountAmount) AS value, 
              d.type 
       FROM completedOrder AS co
       LEFT JOIN discount AS d ON co.discountId = d.id
       WHERE co.createdAt BETWEEN ? AND ?
         AND (co.discountId IS NOT NULL OR co.discountAmount > 0)`,
      [startDate, endDate]
    );
    
    console.log("Orders found:", orders.length);
    
    const aggregatedData: Record<string, DiscountReportResponse> = {};
    
    for (const order of orders) {
      const discountKey = order.discountId ? order.discountId.toString() : "manual";
      
      if (!aggregatedData[discountKey]) {
        aggregatedData[discountKey] = {
          name: order.discountName,
          discount: order.type === "PERCENTAGE" ? `${order.value}%` : `${order.value}`,
          count: 0,
          grossDiscount: 0,
        };
      }
      
      aggregatedData[discountKey].count += 1;
      aggregatedData[discountKey].grossDiscount += Number(order.discountAmount || 0);
    }
    
    const result = Object.values(aggregatedData).sort((a, b) => b.grossDiscount - a.grossDiscount);
    console.log("Aggregated Discount Data:", result);
    
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
