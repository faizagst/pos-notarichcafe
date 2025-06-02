import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import {
  parseISO,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  addDays,
  addWeeks,
  addMonths,
  addYears,
} from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "daily";
    const dateStr = searchParams.get("date");
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    let startDate: Date;
    let endDate: Date;

    if (dateStr) {
      const parsed = parseISO(dateStr); // bisa YYYY-MM-DD atau lebih
      const baseDate = startOfDay(parsed);

      switch (period) {
        case "daily":
          startDate = baseDate;
          endDate = addDays(startDate, 1);
          break;
        case "weekly":
          startDate = startOfWeek(baseDate, { weekStartsOn: 1 }); // Senin
          endDate = addWeeks(startDate, 1);
          break;
        case "monthly":
          startDate = startOfMonth(baseDate);
          endDate = addMonths(startDate, 1);
          break;
        case "yearly":
          startDate = startOfYear(baseDate);
          endDate = addYears(startDate, 1);
          break;
        default:
          startDate = baseDate;
          endDate = addDays(baseDate, 1);
      }
    } else if (start && end) {
      startDate = parseISO(start);
      endDate = parseISO(end);
    } else {
      const now = startOfDay(new Date());
      if (period === "daily") {
        startDate = now;
        endDate = addDays(now, 1);
      } else if (period === "weekly") {
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = addWeeks(startDate, 1);
      } else if (period === "monthly") {
        startDate = startOfMonth(now);
        endDate = addMonths(startDate, 1);
      } else if (period === "yearly") {
        startDate = startOfYear(now);
        endDate = addYears(startDate, 1);
      } else {
        startDate = now;
        endDate = addDays(now, 1);
      }
    }

    // Query top 5 menu dengan total quantity terbanyak
    const [topSellers] = await db.execute(
      `
      SELECT coi.menuId, SUM(coi.quantity) as totalSold
      FROM completedOrderItem coi
      INNER JOIN completedOrder co ON coi.orderId = co.id
      WHERE co.createdAt >= ? AND co.createdAt < ?
      GROUP BY coi.menuId
      ORDER BY totalSold DESC
      LIMIT 5
    `,
      [startDate, endDate]
    );

    const topSellersData = topSellers as { menuId: number; totalSold: number }[];

    const topSellerDetails = await Promise.all(
      topSellersData.map(async ({ menuId, totalSold }) => {
        const [menuResult] = await db.execute(
          `SELECT name FROM menu WHERE id = ?`,
          [menuId]
        );
        const menu = (menuResult as any[])[0];
        return {
          menuName: menu?.name || "Unknown",
          totalSold,
        };
      })
    );

    const [orderCountResult] = await db.execute(
      `SELECT COUNT(*) as totalOrders FROM completedOrder WHERE createdAt >= ? AND createdAt < ?`,
      [startDate, endDate]
    );
    const totalOrders = (orderCountResult as any[])[0]?.totalOrders || 0;

    const [revenueResult] = await db.execute(
      `SELECT SUM(total) as totalRevenue FROM completedOrder WHERE createdAt >= ? AND createdAt < ?`,
      [startDate, endDate]
    );
    const totalRevenue = (revenueResult as any[])[0]?.totalRevenue || 0;

    return NextResponse.json({
      topSellers: topSellerDetails,
      totalOrders,
      totalRevenue,
    });
  } catch (error) {
    console.error("Error fetching top sellers:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
