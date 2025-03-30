import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { RowDataPacket } from "mysql2";

// Interface untuk respons API
interface TaxReportResponse {
  name: string;
  taxRate: string;
  taxableAmount: number;
  taxCollected: number;
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

    // Ambil pajak aktif
    const [taxes] = await db.query<RowDataPacket[]>(`SELECT id, name, value FROM tax WHERE isActive = 1`);

    if (taxes.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const activeTax = taxes[0]; // ambil satu pajak aktif
    const taxId = activeTax.id;
    const taxName = activeTax.name;
    const taxRate = `${activeTax.value}%`;

    // Ambil order yang memiliki pajak > 0
    const [orders] = await db.query<RowDataPacket[]>(
      `
      SELECT 
        co.id AS orderId,
        co.taxAmount,
        co.discountAmount,
        coi.quantity,
        m.price
      FROM completedOrder co
      JOIN completedOrderItem coi ON co.id = coi.orderId
      JOIN menu m ON coi.menuId = m.id
      WHERE co.createdAt >= ? AND co.createdAt < ? AND co.taxAmount > 0
      `,
      [startDate, endDate]
    );

    if (orders.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Group by orderId
    const groupedOrders: Record<number, RowDataPacket[]> = {};
    for (const order of orders) {
      if (!groupedOrders[order.orderId]) {
        groupedOrders[order.orderId] = [];
      }
      groupedOrders[order.orderId].push(order);
    }

    let taxableAmountTotal = 0;
    let taxCollectedTotal = 0;

    for (const orderItems of Object.values(groupedOrders)) {
      const order = orderItems[0]; // info order dari baris pertama
      const itemTotal = orderItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
      const discount = Number(order.discountAmount || 0);
      const taxableAmount = itemTotal - discount;
      const taxCollected = Number(order.taxAmount || 0);

      taxableAmountTotal += taxableAmount;
      taxCollectedTotal += taxCollected;
    }

    const result: TaxReportResponse[] = [
      {
        name: taxName,
        taxRate,
        taxableAmount: taxableAmountTotal,
        taxCollected: taxCollectedTotal,
      },
    ];

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
