// app/api/item-sales/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

interface ItemSalesResponse {
  menuName: string;
  category: string;
  quantity: number;
  totalCollected: number;
  hpp: number;
  discount: number;
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

    const [orders] = await db.execute(
      `
      SELECT 
        o.id AS orderId,
        o.discountAmount,
        coi.quantity,
        m.id AS menuId,
        m.name AS menuName,
        m.category,
        m.price,
        m.hargaBakul
      FROM completedOrder o
      JOIN completedOrderItem coi ON o.id = coi.orderId
      JOIN menu m ON coi.menuId = m.id
      WHERE o.createdAt >= ? AND o.createdAt < ?
      `,
      [startDate, endDate]
    );

    const rows:any = Array.isArray(orders) ? orders : [];

    const orderMap = new Map<number, { totalItems: number; discount: number }>();
    for (const row of rows) {
      const orderId = row.orderId;
      const quantity = Number(row.quantity);
      const discount = Number(row.discountAmount || 0);
      if (!orderMap.has(orderId)) {
        orderMap.set(orderId, { totalItems: 0, discount });
      }
      orderMap.get(orderId)!.totalItems += quantity;
    }

    const aggregatedData: Record<number, ItemSalesResponse> = {};

    for (const row of rows) {
      const menuId = row.menuId;
      const quantity = Number(row.quantity);
      const price = Number(row.price);
      const hpp = Number(row.hargaBakul);
      const orderId = row.orderId;

      const { totalItems, discount } = orderMap.get(orderId)!;
      const discountPerItem = totalItems > 0 ? discount / totalItems : 0;

      if (!aggregatedData[menuId]) {
        aggregatedData[menuId] = {
          menuName: row.menuName,
          category: row.category,
          quantity: 0,
          totalCollected: 0,
          hpp: 0,
          discount: 0,
        };
      }

      aggregatedData[menuId].quantity += quantity;
      aggregatedData[menuId].totalCollected += (price * quantity) - (discountPerItem * quantity);
      aggregatedData[menuId].hpp += hpp * quantity;
      aggregatedData[menuId].discount += discountPerItem * quantity;
    }

    const result: ItemSalesResponse[] = Object.values(aggregatedData).sort(
      (a, b) => b.totalCollected - a.totalCollected
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching item sales:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
