import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const menuId = Number(params.id);
  if (isNaN(menuId)) {
    return NextResponse.json({ message: "ID tidak valid" }, { status: 400 });
  }

  try {
    const [menus] = await db.query(`SELECT * FROM menu WHERE id = ?`, [menuId]);
    const menu = (menus as any)[0];

    if (!menu) {
      return NextResponse.json({ message: "Menu tidak ditemukan" }, { status: 404 });
    }

    const [ingredients] = await db.query(
      `SELECT mi.*, i.* 
       FROM menuIngredient mi 
       JOIN ingredient i ON mi.ingredientId = i.id 
       WHERE mi.menuId = ?`,
      [menuId]
    );

    return NextResponse.json({ ...menu, ingredients }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching menu:", error);
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const menuId = Number(params.id);
  if (isNaN(menuId)) {
    return NextResponse.json({ message: "ID tidak valid" }, { status: 400 });
  }

  try {
    // Hapus relasi terlebih dahulu
    await db.query(`DELETE FROM menuIngredient WHERE menuId = ?`, [menuId]);
    await db.query(`DELETE FROM menuModifier WHERE menuId = ?`, [menuId]);
    await db.query(`DELETE FROM menuDiscount WHERE menuId = ?`, [menuId]);
    await db.query(`DELETE FROM menuComposition WHERE menuId = ?`, [menuId]);

    // Hapus data menu utama
    const [result] = await db.query(`DELETE FROM menu WHERE id = ?`, [menuId]);

    return NextResponse.json({
      message: "Menu dan data relasi berhasil dihapus",
      menuId,
    }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting menu:", error);
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const menuId = Number(params.id);
  if (isNaN(menuId)) {
    return NextResponse.json({ message: "ID tidak valid" }, { status: 400 });
  }

  const body = await req.json();
  const { Status } = body;

  if (!Status || !["Tersedia", "Habis"].includes(Status)) {
    return NextResponse.json({
      message: 'Status diperlukan dan harus "Tersedia" atau "Habis"',
    }, { status: 400 });
  }

  try {
    const [result] = await db.query(
      `UPDATE menu SET Status = ? WHERE id = ?`,
      [Status, menuId]
    );

    return NextResponse.json({
      message: "Status menu berhasil diperbarui",
      menu: { id: menuId, Status },
    }, { status: 200 });
  } catch (error: any) {
    console.error("Error updating menu status:", error);
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}
