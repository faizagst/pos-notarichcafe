import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const today = new Date();

    // Ambil semua data gudang
    const [gudangs]: any[] = await db.execute(`SELECT * FROM gudang`);

    for (const gudang of gudangs) {
      // Simpan snapshot harian ke tabel dailyGudangStock
      await db.execute(
        `INSERT INTO dailyGudangStock 
          (date, gudangId, gudangName, start, stockIn, used, wasted, stock, stockMin) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          today,
          gudang.id,
          gudang.name,
          gudang.start,
          gudang.stockIn,
          gudang.used,
          gudang.wasted,
          gudang.stock,
          gudang.stockMin,
        ]
      );

      // Reset data gudang: set start = stock hari ini, dan reset field transaksi harian
      await db.execute(
        `UPDATE gudang SET 
          start = ?, stockIn = 0, used = 0, wasted = 0, stock = ? 
         WHERE id = ?`,
        [gudang.stock, gudang.stock, gudang.id]
      );
    }

    return NextResponse.json({
      message: "Daily gudang stock reset successful and history saved.",
    });
  } catch (error: any) {
    console.error("Error resetting daily gudang stock:", error);
    return NextResponse.json(
      { message: "Failed to reset daily gudang stock", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}
