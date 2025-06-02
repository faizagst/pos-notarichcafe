import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(_req: NextRequest) {
  try {
    // Ambil semua menu dengan type NORMAL
    const [menus] = await db.query(`
      SELECT * FROM menu WHERE type = 'NORMAL'
    `);

    // Ambil semua relasi yang dibutuhkan
    const [ingredients] = await db.query(`
      SELECT mi.menuId, mi.amount, i.*
      FROM menuIngredient mi
      JOIN ingredient i ON mi.ingredientId = i.id
    `);

    const [discounts] = await db.query(`
      SELECT md.menuId, d.*
      FROM menuDiscount md
      JOIN discount d ON md.discountId = d.id
      WHERE d.isActive = true
    `);

    const [modifiers] = await db.query(`
      SELECT mm.menuId, m.*
      FROM menuModifier mm
      JOIN modifier m ON mm.modifierId = m.id
    `);

    // Buat peta data
    const ingredientMap = new Map<number, any[]>();
    const discountMap = new Map<number, any[]>();
    const modifierMap = new Map<number, any[]>();

    for (const row of ingredients as any[]) {
      const menuId = row.menuId;
      if (!ingredientMap.has(menuId)) ingredientMap.set(menuId, []);
      ingredientMap.get(menuId)!.push({
        amount: row.amount,
        unit: row.unit,
        finishedUnit: row.finishedUnit,
        ingredient: {
          id: row.id,
          name: row.name,
          price: Number(row.price),
          batchYield: Number(row.batchYield),
          type: row.type,
        },
      });
    }

    for (const row of discounts as any[]) {
      const menuId = row.menuId;
      if (!discountMap.has(menuId)) discountMap.set(menuId, []);
      discountMap.get(menuId)!.push({
        discount: {
          id: row.id,
          name: row.name,
          type: row.type,
          scope: row.scope,
          value: row.value,
          isActive: row.isActive,
        },
      });
    }

    for (const row of modifiers as any[]) {
      const menuId = row.menuId;
      if (!modifierMap.has(menuId)) modifierMap.set(menuId, []);
      modifierMap.get(menuId)!.push({
        modifier: {
          id: row.id,
          name: row.name,
          type: row.type,
          options: row.options, // asumsikan options disimpan sebagai string/json
        },
      });
    }

    const updatedMenus = await Promise.all(
      (menus as any[]).map(async (menu) => {
        const menuId = menu.id;
        const menuIngredients = ingredientMap.get(menuId) || [];

        // Hitung hargaBakul
        const totalCost = menuIngredients.reduce((acc, item) => {
          const ingredient = item.ingredient;
          const amount = Number(item.amount) || 0;
          const price = Number(ingredient.price) || 0;
          const batchYield = Number(ingredient.batchYield) || 0;
          let cost = 0;

          if (ingredient.type.toUpperCase() === 'SEMI_FINISHED' && batchYield > 0) {
            // cost = (amount / batchYield) * price;
            cost = amount * price;
          } else {
            cost = amount * price;
          }
          return acc + cost;
        }, 0);

        // Update hargaBakul
        await db.execute(`UPDATE menu SET hargaBakul = ? WHERE id = ?`, [totalCost, menuId]);

        return {
          ...menu,
          hargaBakul: totalCost,
          ingredients: menuIngredients,
          discounts: discountMap.get(menuId) || [],
          modifiers: modifierMap.get(menuId) || [],
        };
      })
    );

    return NextResponse.json(updatedMenus);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
