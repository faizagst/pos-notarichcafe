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
      if (endDateParam) {
        endDate = new Date(endDateParam);
        endDate.setDate(endDate.getDate() + 1);
      } else {
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 1);
      }
    } else {
      const dateString = date || new Date().toISOString();
      ({ startDate, endDate } = getStartAndEndDates(period, dateString));
    }

    const [orders] = await db.execute(
      `
      SELECT 
        co.id AS order_id,
        co.discountAmount,
        co.taxAmount,
        co.gratuityAmount,
        coi.quantity,
        m.price AS menu_price,
        m.hargaBakul AS menu_cost
      FROM completedOrder co
      LEFT JOIN completedOrderItem coi ON co.id = coi.orderId
      LEFT JOIN menu m ON coi.menuId = m.id
      WHERE co.createdAt >= ? AND co.createdAt < ?
      `,
      [startDate, endDate]
    );

    type OrderRow = {
      order_id: number;
      discountAmount: string | number | null;
      taxAmount: string | number | null;
      gratuityAmount: string | number | null;
      quantity: number | null;
      menu_price: string | number | null;
      menu_cost: string | number | null;
    };

    const groupedOrders: Record<number, OrderRow[]> = {};
    for (const row of orders as OrderRow[]) {
      if (!groupedOrders[row.order_id]) groupedOrders[row.order_id] = [];
      groupedOrders[row.order_id].push(row);
    }

    let grossSales = 0;
    let discounts = 0;
    let tax = 0;
    let gratuity = 0;

    for (const orderRows of Object.values(groupedOrders)) {
      for (const item of orderRows) {
        const quantity = item.quantity || 0;
        const price = Number(item.menu_price || 0);
        const cost = Number(item.menu_cost || 0);
        grossSales += (price - cost) * quantity;
      }

      const sample = orderRows[0];
      discounts += Number(sample.discountAmount || 0);
      tax += Number(sample.taxAmount || 0);
      gratuity += Number(sample.gratuityAmount || 0);
    }

    const refunds = 0;
    const netSales = grossSales - discounts - refunds;

    const remainder = Math.round(netSales) % 100;
    const rounding = remainder === 0 ? 0 : 100 - remainder;
    const totalCollected = netSales + gratuity + tax + rounding;

    const response = {
      grossSales,
      discounts,
      refunds,
      netSales,
      gratuity,
      tax,
      rounding,
      totalCollected,
      ordersCount: Object.keys(groupedOrders).length,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in sales-summary:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
