import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

function getStartOfISOWeek(isoWeek: string): Date {
  const [yearStr, weekStr] = isoWeek.split("-W");
  const year = Number(yearStr);
  const week = Number(weekStr);
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = new Date(simple);
  if (dow === 0) ISOweekStart.setDate(simple.getDate() + 1);
  else ISOweekStart.setDate(simple.getDate() - dow + 1);
  return ISOweekStart;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const period = searchParams.get("period");

  if (!date || !period) {
    return NextResponse.json({ error: "Missing date or period" }, { status: 400 });
  }

  let startDate: Date;
  let endDate: Date;

  try {
    // Default "custom" period to "daily"
    const periodToUse = period === "custom" ? "daily" : period;

    if (periodToUse === "daily") {
      startDate = new Date(date);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else if (periodToUse === "weekly") {
      startDate = getStartOfISOWeek(date);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
    } else if (periodToUse === "monthly") {
      const [year, month] = date.split("-");
      startDate = new Date(Number(year), Number(month) - 1, 1);
      endDate = new Date(Number(year), Number(month), 1);
    } else if (periodToUse === "yearly") {
      const year = Number(date);
      startDate = new Date(year, 0, 1);
      endDate = new Date(year + 1, 0, 1);
    } else {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    // Summary
    const [summaryResult]: any[] = await db.query(
      `SELECT COUNT(*) AS totalOrders, COALESCE(SUM(finalTotal), 0) AS totalSales
       FROM completedOrder
       WHERE createdAt >= ? AND createdAt < ?`,
      [startDate, endDate]
    );

    const summary = {
      totalOrders: Number(summaryResult[0]?.totalOrders || 0),
      totalSales: Number(summaryResult[0]?.totalSales || 0),
    };

    // Detail Orders
    const [orderRows]: any[] = await db.query(
      `SELECT 
         co.id AS orderId,
         co.createdAt,
         co.finalTotal,
         oi.quantity,
         m.name AS menuName,
         m.price
       FROM completedOrder co
       JOIN completedOrderItem oi ON oi.orderId = co.id
       JOIN menu m ON m.id = oi.menuId
       WHERE co.createdAt >= ? AND co.createdAt < ?
       ORDER BY co.createdAt DESC`,
      [startDate, endDate]
    );

    const ordersMap = new Map<number, any>();

    for (const row of orderRows) {
      if (!ordersMap.has(row.orderId)) {
        ordersMap.set(row.orderId, {
          orderId: row.orderId,
          createdAt: row.createdAt,
          total: Number(row.finalTotal),
          items: [],
        });
      }

      ordersMap.get(row.orderId).items.push({
        menuName: row.menuName,
        quantity: row.quantity,
        price: Number(row.price),
      });
    }

    const response = {
      summary,
      orders: Array.from(ordersMap.values()),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching sales detail:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
