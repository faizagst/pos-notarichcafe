import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ message: "ID is required" }, { status: 400 });
  }

  const menuId = parseInt(id);
  if (isNaN(menuId)) {
    return NextResponse.json({ message: "Invalid ID format" }, { status: 400 });
  }

  try {
    // Ambil menu
    const [menus] = await db.query(`SELECT * FROM menu WHERE id = ?`, [menuId]);
    const menu = (menus as any)[0];

    if (!menu) {
      return NextResponse.json({ message: "Menu not found" }, { status: 404 });
    }

    // Ambil ingredients
    const [ingredients] = await db.query(
      `SELECT mi.*, i.* 
       FROM menuIngredient mi 
       JOIN ingredient i ON mi.ingredientId = i.id 
       WHERE mi.menuId = ?`,
      [menuId]
    );

    // Ambil modifiers
    const [modifiers] = await db.query(
      `SELECT mm.*, m.* 
       FROM menuModifier mm 
       JOIN modifier m ON mm.modifierId = m.id 
       WHERE mm.menuId = ?`,
      [menuId]
    );

    // Ambil discounts
    const [discounts] = await db.query(
      `SELECT md.*, d.* 
       FROM menuDiscount md 
       JOIN discount d ON md.discountId = d.id 
       WHERE md.menuId = ?`,
      [menuId]
    );

    return NextResponse.json({
      menu: {
        ...menu,
        ingredients,
        modifiers,
        discounts,
      },
    });
  } catch (error: any) {
    console.error("Error fetching menu:", error);
    return NextResponse.json({ message: "Failed to fetch menu", error: error.message }, { status: 500 });
  }
}
