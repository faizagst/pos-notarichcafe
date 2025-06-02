import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// GET: Ambil semua kategori menu
export async function GET() {
  try {
    const [categories] = await db.query("SELECT * FROM categoryMenu");
    return NextResponse.json({ categories }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: "Gagal mengambil data kategori menu", error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}

// POST: Tambah kategori menu baru
export async function POST(req: NextRequest) {
  try {
    const { kategori } = await req.json();

    if (!kategori || typeof kategori !== "string") {
      return NextResponse.json(
        { message: "Kategori harus berupa string dan tidak boleh kosong" },
        { status: 400 }
      );
    }

    // Cek nama  yang sama
    const [existing] = await db.query(
      'SELECT id FROM categoryMenu WHERE kategori = ?',
      [kategori]
    );

    if ((existing as any[]).length > 0) {
      return NextResponse.json({ message: 'Category name already exists' }, { status: 400 });
    }

    const [result]: any = await db.execute(
      "INSERT INTO categoryMenu (kategori) VALUES (?)",
      [kategori]
    );

    const [newCategory]: any = await db.query("SELECT * FROM categoryMenu WHERE id = ?", [result.insertId]);

    return NextResponse.json(
      { message: "Kategori menu berhasil dibuat", category: newCategory[0] },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: "Gagal membuat kategori menu", error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
