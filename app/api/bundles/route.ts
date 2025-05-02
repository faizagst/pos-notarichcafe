import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { RowDataPacket } from "mysql2";

// GET /api/bundles
export async function GET(req: NextRequest) {
  try {
    // Ambil semua menu dengan type = 'BUNDLE'
    const [bundles] = await db.query<RowDataPacket[]>(`
      SELECT *
      FROM menu
      WHERE type = 'BUNDLE'
    `);

    if (bundles.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const bundleIds = bundles.map((b) => b.id);

    // Komposisi bundle
    const [compositions] = await db.query<RowDataPacket[]>(`
      SELECT 
        mc.bundleId,
        mc.menuId,
        mc.amount AS quantity,
        m.id AS menu_id,
        m.name AS menu_name,
        m.price AS menu_price,
        m.hargaBakul AS menu_hargaBakul,
        m.type AS menu_type,
        m.description AS menu_description,
        m.image AS menu_image
      FROM menuComposition mc
      JOIN menu m ON mc.menuId = m.id
      WHERE mc.bundleId IN (?)
    `, [bundleIds]);

    const compositionsMap: Record<number, any[]> = {};
    
    for (const comp of compositions) {
      if (!compositionsMap[comp.bundleId]) compositionsMap[comp.bundleId] = [];

      compositionsMap[comp.bundleId].push({
        menuId: comp.menuId,
        amount: comp.quantity,
        menu: {
          id: comp.menu_id,
          name: comp.menu_name,
          price: comp.menu_price,
          hargaBakul: comp.menu_hargaBakul,
          type: comp.menu_type,
          description: comp.menu_description,
          image: comp.menu_image,
        },
      });
    }

    // Discount untuk bundle
    const [discounts] = await db.query<RowDataPacket[]>(`
      SELECT 
        md.menuId,
        d.id, d.name, d.type, d.scope, d.value, d.isActive
      FROM menuDiscount md
      JOIN discount d ON md.discountId = d.id
      WHERE md.menuId IN (?)
    `, [bundleIds]);

    const discountsMap: Record<number, any[]> = {};
    for (const d of discounts) {
      if (!discountsMap[d.menuId]) discountsMap[d.menuId] = [];

      discountsMap[d.menuId].push({
        discount: {
          id: d.id,
          name: d.name,
          type: d.type,
          scope: d.scope,
          value: d.value,
          isActive: d.isActive,
        },
      });
    }

    // Modifier untuk bundle
    const [modifiers] = await db.query<RowDataPacket[]>(`
      SELECT 
        mm.menuId,
        m.id AS modifier_id,
        m.name AS modifier_name,
        m.price,
        c.id AS category_id,
        c.name AS category_name
      FROM menuModifier mm
      JOIN modifier m ON mm.modifierId = m.id
      JOIN modifierCategory c ON m.categoryId = c.id
      WHERE mm.menuId IN (?)
    `, [bundleIds]);

    const modifiersMap: Record<number, any[]> = {};
    for (const mod of modifiers) {
      if (!modifiersMap[mod.menuId]) modifiersMap[mod.menuId] = [];

      modifiersMap[mod.menuId].push({
        modifier: {
          id: mod.modifier_id,
          name: mod.modifier_name,
          price: mod.price,
          category: {
            id: mod.category_id,
            name: mod.category_name,
          },
        },
      });
    }

    // Gabungkan semuanya
    const result = bundles.map((bundle) => ({
      ...bundle,
      bundleCompositions: compositionsMap[bundle.id] || [],
      discounts: discountsMap[bundle.id] || [],
      modifiers: modifiersMap[bundle.id] || [],
    }));

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error retrieving bundles:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
