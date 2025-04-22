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


export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const menuId = Number(id);
  if (isNaN(menuId)) {
    return NextResponse.json({ message: "ID tidak valid" }, { status: 400 });
  }

  const body = await req.json();
  const { Status, isActive } = body;

  if (Status === undefined && isActive === undefined) {
    return NextResponse.json({ message: "Status atau isActive harus diberikan" }, { status: 400 });
  }

  try {
    let query = "UPDATE menu SET ";
    const params: any[] = [];

    if (Status !== undefined) {
      if (!["Tersedia", "Habis"].includes(Status)) {
        return NextResponse.json({
          message: 'Status harus "Tersedia" atau "Habis"',
        }, { status: 400 });
      }
      query += "Status = ?, ";
      params.push(Status);
    }

    if (isActive !== undefined) {
      query += "isActive = ?, ";
      params.push(isActive ? 1 : 0);
    }

    query = query.replace(/,\s*$/, "") + " WHERE id = ?";
    params.push(menuId);

    await db.query(query, params);

    // Emit event `menuUpdated` ke semua client yang terhubung
    const io = (global as any).io;
    if (io) {
      io.emit("menuUpdated", { menuId, Status, isActive });
    }

    return NextResponse.json({
      message: "Menu berhasil diperbarui",
      menu: { id: menuId, Status, isActive },
    }, { status: 200 });
  } catch (error: any) {
    console.error("Error updating menu:", error);
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}



