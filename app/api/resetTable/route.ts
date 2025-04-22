import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tableNumber } = body;

    if (!tableNumber) {
      return NextResponse.json({ error: "Table number is required" }, { status: 400 });
    }

    const conn = await db.getConnection();

    try {
      // Hapus order yang tidak punya reservasi
      await conn.query(
        `DELETE FROM \`order\` WHERE tableNumber = ? AND reservasiId IS NULL`,
        [tableNumber]
      );

      // Cek apakah ada reservasi aktif (BOOKED / OCCUPIED) di meja tersebut
      const [reservasiRows] = await conn.query(
        `SELECT id FROM reservasi WHERE nomorMeja = ? AND status IN ('BOOKED', 'OCCUPIED')`,
        [tableNumber]
      );

      if ((reservasiRows as any[]).length === 0) {
        await conn.query(
          `DELETE FROM dataMeja WHERE nomor_meja = ?`,
          [parseInt(tableNumber, 10)]
        );
      }

      return NextResponse.json({ message: `Meja ${tableNumber} berhasil direset` });
    } catch (error: any) {
      console.error("Error resetting table:", error);
      return NextResponse.json({ error: "Gagal mereset meja", detail: error.message }, { status: 500 });
    } finally {
      conn.release();
    }
  } catch (error: any) {
    console.error("Request error:", error);
    return NextResponse.json({ error: "Gagal memproses permintaan", detail: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
