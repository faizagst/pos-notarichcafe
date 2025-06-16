import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// PUT: Update kategori modifier
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const categoryId = Number(id);

  if (!categoryId) {
    return NextResponse.json({ message: "ID kategori tidak valid" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ message: "Nama kategori wajib diisi" }, { status: 400 });
    }

    // Jika user ingin mengubah nama, cek apakah nama sudah dipakai oleh modifier Category lain
    if (body.name) {
      const [existingRows]: any = await db.query(
        'SELECT id FROM modifierCategory WHERE name = ? AND id != ?',
        [body.name, categoryId]
      );
      if (existingRows.length > 0) {
        return NextResponse.json({ error: 'Category name already exists' }, { status: 409 });
      }
    }

    await db.execute(
      "UPDATE modifierCategory SET name = ?, description = ?, updatedAt = NOW() WHERE id = ?",
      [name, description || null, categoryId]
    );

    const [updatedCategory]: any = await db.query("SELECT * FROM modifierCategory WHERE id = ?", [categoryId]);

    return NextResponse.json(
      { message: "Kategori modifier berhasil diperbarui", category: updatedCategory[0] },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE: Hapus kategori modifier
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const categoryId = Number(id);

  if (!categoryId) {
    return NextResponse.json({ message: "ID kategori tidak valid" }, { status: 400 });
  }

  try {
    // Cek apakah kategori masih dipakai oleh modifier
    const [modifiers]: any = await db.query(
      "SELECT id FROM modifier WHERE categoryId = ?",
      [categoryId]
    );
    if (modifiers.length > 0) {
      return NextResponse.json(
        { message: "Kategori tidak bisa dihapus karena masih digunakan oleh modifier." },
        { status: 409 }
      );
    }

    await db.execute("DELETE FROM modifierCategory WHERE id = ?", [categoryId]);

    return NextResponse.json({ message: "Kategori modifier berhasil dihapus" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
