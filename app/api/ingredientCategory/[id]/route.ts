import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// PUT: Update kategori berdasarkan ID
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const categoryId = Number(id);

  if (!categoryId) {
    return NextResponse.json({ message: "ID kategori tidak valid" }, { status: 400 });
  }

  const body = await req.json();
  const keys = Object.keys(body);
  const values = Object.values(body);

  try {
    if (keys.length === 0) {
      return NextResponse.json({ error: "No update data provided" }, { status: 400 });
    }

    // Jika user ingin mengubah nama, cek apakah nama sudah dipakai oleh category lain
    if (body.name) {
      const [existingRows]: any = await db.query(
        'SELECT id FROM ingredientCategory WHERE name = ? AND id != ?',
        [body.name, categoryId]
      );
      if (existingRows.length > 0) {
        return NextResponse.json({ error: 'Category name already exists' }, { status: 409 });
      }
    }

    const setClause = keys.map((key) => `${key} = ?`).join(", ");

    await db.execute(`UPDATE ingredientCategory SET ${setClause}, updatedAt = NOW() WHERE id = ?`, [...values, categoryId]);

    const [updatedCategory]: any = await db.execute(
      `SELECT * FROM ingredientCategory WHERE id = ?`,
      [categoryId]
    );

    return NextResponse.json({
      success: true,
      message: "Ingredient berhasil dibuat!",
      category: updatedCategory[0],
    });
  } catch (error: any) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Gagal mengupdate kategori' }, { status: 500 });
  }
}

// DELETE: Hapus kategori berdasarkan ID
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const categoryId = Number(id);

  if (!categoryId) {
    return NextResponse.json({ message: "ID kategori tidak valid" }, { status: 400 });
  }

  try {
    const [usedIngredients]: any = await db.query(
      `SELECT id FROM ingredient WHERE categoryId = ?`,
      [categoryId]
    );

    if (usedIngredients.length > 0) {
      return NextResponse.json({
        message: "Kategori tidak dapat dihapus karena masih digunakan oleh bahan",
      }, { status: 409 });
    }

    const [deletedCategory]: any = await db.execute(
      `SELECT * FROM ingredientCategory WHERE id = ?`,
      [categoryId]
    );

    if (deletedCategory.length === 0) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });
    }

    await db.execute(`DELETE FROM ingredientCategory WHERE id = ?`, [categoryId]);

    return NextResponse.json({ category: deletedCategory[0] });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Gagal menghapus kategori' }, { status: 500 });
  }
}
