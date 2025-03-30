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

    await db.execute("UPDATE categoryMenu SET kategori = ? WHERE id = ?", [kategori, categoryId]);

    const [updated]:any = await db.query("SELECT * FROM categoryMenu WHERE id = ?", [categoryId]);

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
