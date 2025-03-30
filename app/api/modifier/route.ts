import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET - Ambil semua modifier beserta relasi ingredient dan category
export async function GET() {
  try {
    const [modifiers] = await db.query(`
      SELECT m.*, c.name AS categoryName
      FROM modifier m
      LEFT JOIN modifierCategory c ON m.categoryId = c.id
    `);

    const modifierIds = (modifiers as any[]).map((mod) => mod.id);
    const [ingredients] = await db.query(`
      SELECT mi.*, i.name AS ingredientName, i.price, i.batchYield, i.type
      FROM modifierIngredient mi
      JOIN ingredient i ON mi.ingredientId = i.id
      WHERE mi.modifierId IN (?)
    `, [modifierIds]);

    // Gabungkan data
    const modifierMap = new Map();
    (modifiers as any[]).forEach((mod) => {
      modifierMap.set(mod.id, { ...mod, category: { id: mod.categoryId, name: mod.categoryName }, ingredients: [] });
    });
    (ingredients as any[]).forEach((ing) => {
      modifierMap.get(ing.modifierId)?.ingredients.push({
        id: ing.id,
        ingredientId: ing.ingredientId,
        amount: ing.amount,
        ingredient: {
          name: ing.ingredientName,
          price: ing.price,
          batchYield: ing.batchYield,
          type: ing.type
        }
      });
    });

    return NextResponse.json(Array.from(modifierMap.values()));
  } catch (error) {
    console.error("Error fetching modifiers:", error);
    return NextResponse.json({ message: "Failed to fetch modifiers" }, { status: 500 });
  }
}

// POST - Buat modifier baru
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, price = 0, categoryId, ingredients = [] } = body;

    if (!name || !categoryId) {
      return NextResponse.json({ message: "Name and Category ID are required" }, { status: 400 });
    }

    const [result]: any = await db.execute(`
      INSERT INTO modifier (name, price, categoryId, updatedAt)
      VALUES (?, ?, ?, NOW())
    `, [name, price, categoryId]);

    const modifierId = result.insertId;

    if (ingredients.length > 0) {
      const values = ingredients.map((ing: any) => [modifierId, ing.ingredientId, ing.amount]);
      await db.query(`
        INSERT INTO modifierIngredient (modifierId, ingredientId, amount)
        VALUES ?
      `, [values]);
    }

    const [createdModifier]:any = await db.query(`
      SELECT m.*, c.name AS categoryName
      FROM modifier m
      LEFT JOIN modifierCategory c ON m.categoryId = c.id
      WHERE m.id = ?
    `, [modifierId]);

    const [createdIngredients]:any = await db.query(`
      SELECT mi.*, i.name AS ingredientName, i.price, i.batchYield, i.type
      FROM modifierIngredient mi
      JOIN ingredient i ON mi.ingredientId = i.id
      WHERE mi.modifierId = ?
    `, [modifierId]);

    return NextResponse.json({
      ...createdModifier[0],
      category: {
        id: categoryId,
        name: createdModifier[0].categoryName
      },
      ingredients: createdIngredients.map((ing: any) => ({
        id: ing.id,
        ingredientId: ing.ingredientId,
        amount: ing.amount,
        ingredient: {
          name: ing.ingredientName,
          price: ing.price,
          batchYield: ing.batchYield,
          type: ing.type
        }
      }))
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating modifier:", error);
    return NextResponse.json({ message: "Failed to create modifier" }, { status: 500 });
  }
}

// PUT - Update modifier
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, price = 0, categoryId, ingredients = [] } = body;

    if (!id || !name || !categoryId) {
      return NextResponse.json({ message: "ID, Name, and Category ID are required" }, { status: 400 });
    }

    await db.execute(`
      UPDATE modifier
      SET name = ?, price = ?, categoryId = ?, updatedAt = NOW()
      WHERE id = ?
    `, [name, price, categoryId, id]);

    await db.execute(`
      DELETE FROM modifierIngredient WHERE modifierId = ?
    `, [id]);

    if (ingredients.length > 0) {
      const values = ingredients.map((ing: any) => [id, ing.ingredientId, ing.amount]);
      await db.query(`
        INSERT INTO modifierIngredient (modifierId, ingredientId, amount)
        VALUES ?
      `, [values]);
    }

    // Fetch updated data
    const [updatedModifier]:any = await db.query(`
      SELECT m.*, c.name AS categoryName
      FROM modifier m
      LEFT JOIN modifierCategory c ON m.categoryId = c.id
      WHERE m.id = ?
    `, [id]);

    const [updatedIngredients]:any = await db.query(`
      SELECT mi.*, i.name AS ingredientName, i.price, i.batchYield, i.type
      FROM modifierIngredient mi
      JOIN ingredient i ON mi.ingredientId = i.id
      WHERE mi.modifierId = ?
    `, [id]);

    return NextResponse.json({
      ...updatedModifier[0],
      category: {
        id: categoryId,
        name: updatedModifier[0].categoryName
      },
      ingredients: updatedIngredients.map((ing: any) => ({
        id: ing.id,
        ingredientId: ing.ingredientId,
        amount: ing.amount,
        ingredient: {
          name: ing.ingredientName,
          price: ing.price,
          batchYield: ing.batchYield,
          type: ing.type
        }
      }))
    });
  } catch (error) {
    console.error("Error updating modifier:", error);
    return NextResponse.json({ message: "Failed to update modifier" }, { status: 500 });
  }
}

// DELETE - Hapus modifier
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ message: "ID is required" }, { status: 400 });
    }

    await db.execute(`DELETE FROM modifier WHERE id = ?`, [id]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting modifier:", error);
    return NextResponse.json({ message: "Failed to delete modifier" }, { status: 500 });
  }
}
