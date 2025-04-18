import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    // Ambil semua menu yang aktif
    const [menus] = await db.execute(`
        SELECT * FROM menu 
        WHERE isActive = true OR LOWER(status) = 'tersedia'
      `);
      

    // Transform menu satu per satu
    const transformedMenus = await Promise.all(
      (menus as any[]).map(async (menu) => {
        const [ingredients]:any = await db.execute(
          `
          SELECT mi.*, i.* FROM menuIngredient mi
          JOIN ingredient i ON mi.ingredientId = i.id
          WHERE mi.menuId = ?
        `,
          [menu.id]
        );

        const [discounts]:any = await db.execute(
          `
          SELECT md.*, d.* FROM menuDiscount md
          JOIN discount d ON md.discountId = d.id
          WHERE md.menuId = ? AND d.isActive = true
        `,
          [menu.id]
        );

        const [modifiers]:any = await db.execute(
          `
          SELECT mm.*, m.*, c.* FROM menuModifier mm
          JOIN modifier m ON mm.modifierId = m.id
          JOIN modifierCategory c ON m.categoryId = c.id
          WHERE mm.menuId = ?
        `,
          [menu.id]
        );

        return {
          ...menu,
          ingredients: ingredients.map((i: any) => ({
            ingredient: {
              id: i.ingredientId,
              name: i.name,
              stock: i.stock,
              unit: i.unit,
            },
          })),
          discounts: discounts.map((d: any) => ({
            discount: {
              id: d.discountId,
              name: d.name,
              type: d.type,
              scope: d.scope,
              value: d.value,
              isActive: d.isActive,
            },
          })),
          modifiers: modifiers.map((m: any) => ({
            modifier: {
              id: m.modifierId,
              name: m.name,
              price: m.price,
              category: {
                id: m.categoryId,
                name: m.categoryName || m["c.name"], // tergantung aliasnya
              },
            },
          })),
        };
      })
    );

    return NextResponse.json(transformedMenus, { status: 200 });
  } catch (error) {
    console.error("Error fetching menus:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
