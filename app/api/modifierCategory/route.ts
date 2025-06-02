// app/api/modifierCategory/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// GET dan POST untuk modifierCategory
export async function GET() {
  try {
    const [categories] = await db.query(`
      SELECT 
        mc.*, 
        (SELECT COUNT(*) FROM modifier WHERE modifier.categoryId = mc.id) AS modifiersCount
      FROM modifierCategory mc
    `);

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ message: "Nama kategori wajib diisi" }, { status: 400 });
    }

    // Cek nama category yang sama
    const [existing] = await db.query(
      'SELECT id FROM modifierCategory WHERE name = ?',
      [name]
    );

    if ((existing as any[]).length > 0) {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 400 });
    }

    const [result]: any = await db.query(
      "INSERT INTO modifierCategory (name, description, updatedAt) VALUES (?, ?, NOW())",
      [name, description || null]
    );

    const [newCategory]: any = await db.query("SELECT * FROM modifierCategory WHERE id = ?", [result.insertId]);

    return NextResponse.json(
      {
        message: "Kategori modifier berhasil dibuat",
        category: newCategory[0],
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
