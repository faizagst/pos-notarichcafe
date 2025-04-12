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
    if (period === "daily") {
      startDate = new Date(date);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else if (period === "weekly") {
      startDate = getStartOfISOWeek(date);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
    } else if (period === "monthly") {
      const [year, month] = date.split("-");
      startDate = new Date(Number(year), Number(month) - 1, 1);
      endDate = new Date(Number(year), Number(month), 1);
    } else if (period === "yearly") {
      const year = Number(date);
      startDate = new Date(year, 0, 1);
      endDate = new Date(year + 1, 0, 1);
    } else {
      startDate = new Date(date);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    }

    // Summary
    const [summaryRow]: any[] = await db.query(
      `SELECT COUNT(*) AS totalOrders, COALESCE(SUM(finalTotal), 0) AS totalSales
       FROM completedOrder
       WHERE createdAt >= ? AND createdAt < ?`,
      [startDate, endDate]
    );

    const summary = {
      totalOrders: Number(summaryRow[0]?.totalOrders || 0),
      totalSales: Number(summaryRow[0]?.totalSales || 0),
    };

    // Order details
    const [orderRows]: any[] = await db.query(
      `SELECT 
        co.id AS orderId,
        co.createdAt,
        co.finalTotal,
        oi.quantity,
        m.name AS menuName,
        m.price
      FROM completedOrder co
      JOIN orderItem oi ON oi.orderId = co.id
      JOIN menu m ON m.id = oi.menuId
      WHERE co.createdAt >= ? AND co.createdAt < ?
      ORDER BY co.createdAt DESC`,
      [startDate, endDate]
    );

    const orderMap = new Map<number, any>();

    for (const row of orderRows) {
      if (!orderMap.has(row.orderId)) {
        orderMap.set(row.orderId, {
          orderId: row.orderId,
          createdAt: row.createdAt,
          total: Number(row.finalTotal),
          items: [],
        });
      }

      orderMap.get(row.orderId).items.push({
        menuName: row.menuName,
        quantity: row.quantity,
        price: Number(row.price),
      });
    }

    const response = {
      summary,
      orders: Array.from(orderMap.values()),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching sales detail:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
