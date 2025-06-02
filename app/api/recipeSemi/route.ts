import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // Ambil semua ingredient dengan type 'SEMI_FINISHED'
    const [semiIngredients] = await db.query(`
      SELECT * FROM ingredient WHERE type = 'SEMI_FINISHED'
    `);

    if (!Array.isArray(semiIngredients) || semiIngredients.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Ambil semua komposisi yang terkait
    const semiIds = semiIngredients.map((i: any) => i.id);
    const [compositions] = await db.query(`
      SELECT ic.*, i.id as rawId, i.name as rawName, i.unit as rawUnit, i.price as rawPrice
      FROM ingredientComposition ic
      JOIN ingredient i ON i.id = ic.rawIngredientId
      WHERE ic.semiIngredientId IN (?)
    `, [semiIds]);

    // Kelompokkan komposisi berdasarkan semiIngredientId
    const groupedCompositions: Record<number, any[]> = {};
    for (const comp of compositions as any[]) {
      if (!groupedCompositions[comp.semiIngredientId]) {
        groupedCompositions[comp.semiIngredientId] = [];
      }

      groupedCompositions[comp.semiIngredientId].push({
        rawIngredient: {
          id: comp.rawId,
          name: comp.rawName,
          unit: comp.rawUnit,
          price: comp.rawPrice
        },
        amount: comp.amount,
      });
    }

    // Gabungkan semi finished ingredients dengan komposisinya
    const result = (semiIngredients as any[]).map(semi => ({
      id: semi.id,
      name: semi.name,
      compositions: groupedCompositions[semi.id] || [],
    }));

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error fetching semi finished ingredients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
