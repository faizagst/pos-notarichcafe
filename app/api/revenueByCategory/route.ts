import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface RevenueResult {
  category: string;
  total: number;
}

export async function GET(req: NextRequest) {
  try {
    // Ambil data quantity dan harga dari CompletedOrderItem + Menu
    const [rows] = await db.execute(
      `
      SELECT 
        m.category AS category,
        SUM(coi.quantity * m.price) AS total
      FROM CompletedOrderItem coi
      JOIN Menu m ON m.id = coi.menuId
      GROUP BY m.category
      `
    );

    const result = (rows as RevenueResult[]).map((row) => ({
      category: row.category || "Unknown",
      total: Number(row.total) || 0,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching revenue by category:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
