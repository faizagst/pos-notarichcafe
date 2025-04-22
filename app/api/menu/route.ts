import { NextRequest, NextResponse } from "next/server";
import db  from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const [menus] = await db.query(
      `SELECT * FROM menu WHERE isActive = true`
    );

    const transformedMenus = await Promise.all(
      (menus as any[]).map(async (menu) => {
        // Ingredients
        const [ingredients] = await db.query(
          `SELECT mi.*, i.name AS ingredientName 
           FROM menuIngredient mi 
           JOIN ingredient i ON mi.ingredientId = i.id 
           WHERE mi.menuId = ?`,
          [menu.id]
        );

        // Discounts
        const [discounts]:any = await db.query(
          `SELECT md.*, d.name, d.type, d.scope, d.value, d.isActive 
           FROM menuDiscount md 
           JOIN discount d ON md.discountId = d.id 
           WHERE md.menuId = ? AND d.isActive = true`,
          [menu.id]
        );

        // Modifiers
        const [modifiers]:any = await db.query(
          `SELECT mm.*, m.name AS modifierName, m.price AS modifierPrice, 
                  mc.id AS categoryId, mc.name AS categoryName
           FROM menuModifier mm
           JOIN modifier m ON mm.modifierId = m.id
           JOIN modifierCategory mc ON m.categoryId = mc.id
           WHERE mm.menuId = ?`,
          [menu.id]
        );

        return {
          ...menu,
          ingredients,
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
              name: m.modifierName,
              price: m.modifierPrice,
              category: {
                id: m.categoryId,
                name: m.categoryName,
              },
            },
          })),
        };
      })
    );

    return NextResponse.json(transformedMenus, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching menus:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
