import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface DetailItem {
  orderId: number;
  orderDate: Date;
  menuName: string;
  quantity: number;
  revenue: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!category) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }

  try {
    const dateFilter: string[] = [];
    if (start) dateFilter.push(`o.createdAt >= '${start}'`);
    if (end) dateFilter.push(`o.createdAt < '${end}'`);
    const whereClause = dateFilter.length > 0 ? `AND ${dateFilter.join(" AND ")}` : "";

    let details: DetailItem[] = [];
    let totalRevenue = 0;
    let totalOrders = 0;

    if (category === "Bundle") {
      const [rows] = await db.execute(
        `
        SELECT 
          o.id AS orderId,
          o.createdAt AS orderDate,
          b.name AS menuName,
          coi.quantity AS quantity,
          (coi.quantity * IFNULL(b.bundlePrice, 0)) AS revenue,
          CONCAT(coi.orderId, '-', coi.bundleId) AS groupKey
        FROM CompletedOrderItem coi
        JOIN CompletedOrder o ON o.id = coi.orderId
        JOIN Bundle b ON b.id = coi.bundleId
        WHERE coi.bundleId IS NOT NULL
        ${whereClause}
        `
      );

      const seen = new Set<string>();
      const result = (rows as any[]).filter((row) => {
        if (seen.has(row.groupKey)) return false;
        seen.add(row.groupKey);
        return true;
      }).map((row) => {
        totalRevenue += Number(row.revenue);
        return {
          orderId: row.orderId,
          orderDate: row.orderDate,
          menuName: row.menuName,
          quantity: row.quantity,
          revenue: Number(row.revenue),
        };
      });

      details = result;
      totalOrders = result.length;

    } else {
      const [rows] = await db.execute(
        `
        SELECT 
          o.id AS orderId,
          o.createdAt AS orderDate,
          m.name AS menuName,
          coi.quantity AS quantity,
          (coi.quantity * m.price) AS revenue
        FROM CompletedOrderItem coi
        JOIN CompletedOrder o ON o.id = coi.orderId
        JOIN Menu m ON m.id = coi.menuId
        WHERE coi.bundleId IS NULL AND m.category = ?
        ${whereClause}
        `,
        [category]
      );

      const result = (rows as any[]).map((row) => {
        const revenue = Number(row.revenue);
        totalRevenue += revenue;
        return {
          orderId: row.orderId,
          orderDate: row.orderDate,
          menuName: row.menuName,
          quantity: row.quantity,
          revenue,
        };
      });

      details = result;
      totalOrders = result.length;
    }

    const summary = { totalRevenue, totalOrders };
    return NextResponse.json({ summary, details });
  } catch (error) {
    console.error("Error fetching revenue by category detail:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
