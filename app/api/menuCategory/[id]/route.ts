import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// PUT: Update kategori menu
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const categoryId = Number(id);

  if (!categoryId) {
    return NextResponse.json({ message: "ID kategori tidak valid" }, { status: 400 });
  }

  try {
    const { kategori } = await req.json();

    if (!kategori || typeof kategori !== "string") {
      return NextResponse.json(
        { message: "Kategori harus berupa string dan tidak boleh kosong" },
        { status: 400 }
      );
    }

    // Jika user ingin mengubah nama, cek apakah nama sudah dipakai oleh category lain
    if (kategori) {
      const [existingRows]: any = await db.query(
        'SELECT id FROM categoryMenu WHERE kategori = ? AND id != ?',
        [kategori, categoryId]
      );
      if (existingRows.length > 0) {
        return NextResponse.json({ message: 'Category name already exists' }, { status: 409 });
      }
    }

    await db.execute("UPDATE categoryMenu SET kategori = ? WHERE id = ?", [kategori, categoryId]);

    const [updated]: any = await db.query("SELECT * FROM categoryMenu WHERE id = ?", [categoryId]);

    return NextResponse.json(
      { message: "Kategori menu berhasil diperbarui", category: updated[0] },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { message: "Gagal memperbarui kategori menu", error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE: Hapus kategori menu
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const categoryId = Number(id);

  if (!categoryId) {
    return NextResponse.json({ message: "ID kategori tidak valid" }, { status: 400 });
  }

  try {
    const [usedMenus]: any = await db.query(
      "SELECT id FROM menu WHERE category = (SELECT kategori FROM categoryMenu WHERE id = ?)",
      [categoryId]
    );

    if (usedMenus.length > 0) {
      return NextResponse.json({
        message: "Kategori tidak dapat dihapus karena masih digunakan oleh menu",
      }, { status: 409 });
    }

    await db.execute("DELETE FROM categoryMenu WHERE id = ?", [categoryId]);

    return NextResponse.json({ message: "Kategori menu berhasil dihapus" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { message: "Gagal menghapus kategori menu", error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
