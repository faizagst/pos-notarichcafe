import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET: Ambil semua kategori beserta jumlah ingredients aktif
export async function GET(_req: NextRequest) {
  try {
    const [categories] = await db.execute(`
      SELECT 
        c.id,
        c.name,
        c.description,
        COUNT(i.id) AS ingredientsCount
      FROM ingredientCategory c
      LEFT JOIN ingredient i ON i.categoryId = c.id AND i.isActive = TRUE
      GROUP BY c.id
    `);

    return NextResponse.json({
      categories,
      toast: {
        type: "success",
        color: "green",
        text: "Ingredient berhasil dibuat!",
      },
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server', detail: error.message },
      { status: 500 }
    );
  }
}

// POST: Tambah kategori baru
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description } = body;

  if (!name) {
    return NextResponse.json({ error: 'Nama kategori wajib diisi' }, { status: 400 });
  }

  try {
    const [result]: any = await db.execute(
      `INSERT INTO ingredientCategory (name, description, updatedAt) VALUES (?, ?, NOW())`,
      [name, description || null]
    );

    const newCategoryId = result.insertId;

    const [newCategory]:any = await db.execute(
      `SELECT * FROM ingredientCategory WHERE id = ?`,
      [newCategoryId]
    );

    return NextResponse.json({ category: newCategory[0] }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat kategori', detail: error.message },
      { status: 500 }
    );
  }
}
