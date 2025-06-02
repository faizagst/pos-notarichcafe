import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { subDays, startOfWeek, startOfMonth, startOfYear, addDays, addWeeks, addMonths, addYears } from "date-fns";

function getStartOfISOWeek(isoWeek: string): Date {
  const [yearStr, weekStr] = isoWeek.split("-W");
  const year = Number(yearStr);
  const week = Number(weekStr);
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = new Date(simple);
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - dow + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - dow);
  }
  return ISOweekStart;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "daily";
    const date = searchParams.get("date");
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    let startDate: Date;
    let endDate: Date;

    if (date) {
      const dateStr = date as string;
      if (period === "daily") {
        startDate = new Date(dateStr);
        endDate = addDays(startDate, 1);
      } else if (period === "weekly") {
        startDate = getStartOfISOWeek(dateStr);
        endDate = addWeeks(startDate, 1);
      } else if (period === "monthly") {
        const [year, month] = dateStr.split("-");
        startDate = new Date(Number(year), Number(month) - 1, 1);
        endDate = addMonths(startDate, 1);
      } else if (period === "yearly") {
        startDate = new Date(Number(dateStr), 0, 1);
        endDate = addYears(startDate, 1);
      } else {
        startDate = new Date(dateStr);
        endDate = addDays(startDate, 1);
      }
    } else if (start && end) {
      startDate = new Date(start);
      endDate = new Date(end);
    } else {
      const now = new Date();
      if (period === "daily") {
        startDate = subDays(now, 1);
        endDate = addDays(startDate, 1);
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
        startDate = subDays(now, 1);
        endDate = addDays(startDate, 1);
      }
    }

    // Query top 5 menuId dengan total quantity terbanyak
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
