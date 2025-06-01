import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

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
    const period = searchParams.get("period") ?? "daily";
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
      ({ startDate, endDate } = getStartAndEndDates(period, date || undefined));
    }

    const [orders] = await db.query<any[]>(`
    SELECT 
      o.id AS orderId,
      o.createdAt,
      o.total,
      o.finalTotal,
      o.discountAmount,

      i.id AS itemId,
      i.quantity,
      i.price AS itemPrice,

      m.name AS menuName,
      m.price AS menuBasePrice,

      md.name AS modifierName,
      md.price AS modifierPrice

    FROM completedOrder o
    LEFT JOIN completedOrderItem i ON i.orderId = o.id
    LEFT JOIN menu m ON i.menuId = m.id
    LEFT JOIN completedOrderItemModifier im ON im.completedOrderItemId = i.id
    LEFT JOIN modifier md ON im.modifierId = md.id
    WHERE o.createdAt >= ? AND o.createdAt < ?
    ORDER BY o.createdAt ASC
  `, [startDate, endDate]);

    const groupedOrders = new Map<number, {
      time: Date;
      items: Map<number, {
        menuName: string;
        quantity: number;
        price: number;
        modifiers: { name: string; price: number }[];
        total: number;
      }>;
      totalPrice: number;
    }>();

    let totalTransactions = 0;
    let totalCollected = 0;
    let netSales = 0;

    for (const row of orders) {
      if (!groupedOrders.has(row.orderId)) {
        groupedOrders.set(row.orderId, {
          time: row.createdAt,
          items: new Map(),
          totalPrice: Number(row.finalTotal),
        });
        totalTransactions++;
        totalCollected += Number(row.finalTotal);
        netSales += Number(row.total) - Number(row.discountAmount ?? 0);
      }

      const order = groupedOrders.get(row.orderId)!;

      // Set item per itemId, NOT menuId
      if (!order.items.has(row.itemId)) {
        order.items.set(row.itemId, {
          menuName: row.menuName,
          quantity: row.quantity,
          price: row.itemPrice,
          modifiers: [],
          total: row.itemPrice * row.quantity, // sudah termasuk modifier
        });
      }

      const item = order.items.get(row.itemId)!;

      // modifier hanya untuk ditampilkan
      if (row.modifierName) {
        item.modifiers.push({
          name: row.modifierName,
          price: row.modifierPrice,
        });
      }
    }

    // Final details
    const details = Array.from(groupedOrders.values()).map(order => ({
      time: order.time,
      items: Array.from(order.items.values()),
      totalPrice: order.totalPrice,
    }));

    return NextResponse.json({
      summary: {
        totalTransactions,
        totalCollected,
        netSales,
      },
      details,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
