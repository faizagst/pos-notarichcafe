import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { RowDataPacket } from "mysql2";

// Interface untuk response
interface CategorySalesResponse {
  category: string;
  itemSold: number;
  totalCollected: number;
  discount: number;
  tax: number;
  gratuity: number;
  netSales: number;
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
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let startDate: Date;
    let endDate: Date;

    if (startDateParam) {
      startDate = new Date(startDateParam);
      endDate = endDateParam ? new Date(endDateParam) : new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      ({ startDate, endDate } = getStartAndEndDates(period, date));
    }

    const [orders] = await db.query<RowDataPacket[]>(
      `
      SELECT 
        co.id AS orderId,
        co.discountAmount,
        co.taxAmount,
        co.gratuityAmount,
        co.createdAt,
        coi.quantity,
        m.price,
        m.category
      FROM completedOrder co
      JOIN completedOrderItem coi ON co.id = coi.orderId
      JOIN menu m ON coi.menuId = m.id
      WHERE co.createdAt >= ? AND co.createdAt < ?
      `,
      [startDate, endDate]
    );

    const aggregatedData: Record<string, CategorySalesResponse> = {};

    const groupedOrders: Record<number, any[]> = {};

    // Grouping order items by orderId
    for (const order of orders) {
      const orderId = order.orderId;
      if (!groupedOrders[orderId]) {
        groupedOrders[orderId] = [];
      }
      groupedOrders[orderId].push(order);
    }

    for (const [orderIdStr, items] of Object.entries(groupedOrders)) {
      const orderId = Number(orderIdStr);
      const order = items[0];

      const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
      const discountPerItem = totalItems > 0 ? Number(order.discountAmount || 0) / totalItems : 0;
      const taxPerItem = totalItems > 0 ? Number(order.taxAmount || 0) / totalItems : 0;
      const gratuityPerItem = totalItems > 0 ? Number(order.gratuityAmount || 0) / totalItems : 0;

      for (const item of items) {
        const category = item.category;
        const quantity = item.quantity;
        const price = Number(item.price);
        const itemTotal = price * quantity;
        const itemCollected = itemTotal - discountPerItem * quantity;

        if (!aggregatedData[category]) {
          aggregatedData[category] = {
            category,
            itemSold: 0,
            totalCollected: 0,
            discount: 0,
            tax: 0,
            gratuity: 0,
            netSales: 0,
          };
        }

        aggregatedData[category].itemSold += quantity;
        aggregatedData[category].totalCollected += itemCollected;
        aggregatedData[category].discount += discountPerItem * quantity;
        aggregatedData[category].tax += taxPerItem * quantity;
        aggregatedData[category].gratuity += gratuityPerItem * quantity;
        aggregatedData[category].netSales += itemCollected + taxPerItem * quantity + gratuityPerItem * quantity - discountPerItem * quantity;
      }
    }

    const result = Object.values(aggregatedData).sort(
      (a, b) => b.totalCollected - a.totalCollected
    );

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
