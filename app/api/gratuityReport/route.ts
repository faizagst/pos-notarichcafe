import { NextRequest, NextResponse } from "next/server";
import  db  from "@/lib/db";

// Interface untuk respons API
interface GratuityReportResponse {
    name: string;
    rate: string;
    gratuityCollected: number;
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
    const period = url.searchParams.get("period") || "daily";
    const date = url.searchParams.get("date");
    const startDateQuery = url.searchParams.get("startDate");
    const endDateQuery = url.searchParams.get("endDate");

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

    // Fetch active gratuity
    const [gratuities]:any = await db.execute(
      "SELECT id, name, value FROM gratuity WHERE isActive = 1"
    );

    if (!Array.isArray(gratuities) || gratuities.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Fetch orders within date range
    const [orders]:any = await db.execute(
      `SELECT id, gratuityAmount FROM completedOrder 
       WHERE createdAt >= ? AND createdAt < ? AND gratuityAmount > 0`,
      [startDate, endDate]
    );

    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Aggregating gratuity data
    const aggregatedData: Record<number, any> = {};
    const activeGratuity = gratuities[0]; // Assume only one active gratuity
    
    for (const order of orders) {
      if (!aggregatedData[activeGratuity.id]) {
        aggregatedData[activeGratuity.id] = {
          name: activeGratuity.name,
          rate: `${activeGratuity.value}%`,
          gratuityCollected: 0,
        };
      }
      aggregatedData[activeGratuity.id].gratuityCollected += Number(order.gratuityAmount || 0);
    }

    const result = Object.values(aggregatedData).sort(
      (a, b) => b.gratuityCollected - a.gratuityCollected
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}


