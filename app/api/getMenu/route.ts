import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    // Ambil semua menu yang aktif
    const [menus] = await db.execute(`
        SELECT * FROM menu
        WHERE isActive = true
      `);


    // Transform menu satu per satu
    const transformedMenus = await Promise.all(
      (menus as any[]).map(async (menu) => {
        let ingredients: any[] = [];

        if (menu.type?.toLowerCase() === "bundle") {
          const [bundleItems]: any = await db.execute(
            `SELECT mc.menuId, mc.amount as menuQty FROM menuComposition mc WHERE mc.bundleId = ?`,
            [menu.id]
          );

          for (const item of bundleItems) {
            const [bundledIngredients]: any = await db.execute(
              `SELECT mi.amount as ingredientQty, i.*, ? as multiplier FROM menuIngredient mi
               JOIN ingredient i ON mi.ingredientId = i.id
               WHERE mi.menuId = ?`,
              [item.menuQty, item.menuId]
            );

            for (const ing of bundledIngredients) {
              ingredients.push({
                ...ing,
                ingredientQty: ing.ingredientQty * ing.multiplier,
              });
            }
          }

          // Gabungkan bahan yang sama
          const groupedIngredients: Record<number, any> = {};
          for (const ing of ingredients) {
            if (!groupedIngredients[ing.id]) {
              groupedIngredients[ing.id] = { ...ing };
            } else {
              groupedIngredients[ing.id].ingredientQty += ing.ingredientQty;
            }
          }

          ingredients = Object.values(groupedIngredients);
        } else {
          const [ingredientRows]: any = await db.execute(
            `SELECT mi.amount as ingredientQty, i.* FROM menuIngredient mi
             JOIN ingredient i ON mi.ingredientId = i.id
             WHERE mi.menuId = ?`,
            [menu.id]
          );
          ingredients = ingredientRows;
        }


        // Hitung maxBeli berdasarkan bahan terendah
        let maxBeli = null;
        if (ingredients.length > 0) {
          maxBeli = Math.min(
            ...ingredients.map((ing: any) =>
              Math.floor(ing.stock / ing.ingredientQty)
            )
          );
        } else {
          maxBeli = 0; // fallback jika tidak ada bahan
        }

        const status = maxBeli <= 0 ? "Habis" : "Tersedia";

        // Dapatkan diskon
        const [discounts]: any = await db.execute(`
          SELECT md.*, d.* FROM menuDiscount md
          JOIN discount d ON md.discountId = d.id
          WHERE md.menuId = ? AND d.isActive = true
        `, [menu.id]);

        // Dapatkan modifier
        const [modifiers]: any = await db.execute(`
          SELECT mm.*, m.*, c.name AS categoryName FROM menuModifier mm
          JOIN modifier m ON mm.modifierId = m.id
          JOIN modifierCategory c ON m.categoryId = c.id
          WHERE mm.menuId = ?
        `, [menu.id]);

        //Update database
        await db.execute(
          `UPDATE menu SET maxBeli = ?, status = ? WHERE id = ?`,
          [maxBeli, status, menu.id]
        );

        // Emit WebSocket jika ada perubahan maxBeli atau status
        try {
          const { server } = req as any;
          if (server?.io) {
            server.io.emit("menuUpdated", { menuId: menu.id });
          }
        } catch (e) {
          console.warn("Tidak bisa mengirim WebSocket emit menuUpdated:", e);
        }

        return {
          ...menu,
          maxBeli,
          status,
          ingredients: ingredients.map((i: any) => ({
            ingredient: {
              id: i.id,
              name: i.name,
              stock: i.stock,
              unit: i.unit,
            },
            qtyNeeded: i.ingredientQty,
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
                name: m.categoryName || m["c.name"],
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
