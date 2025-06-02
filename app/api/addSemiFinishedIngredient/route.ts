import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

type Payload = {
  name: string;
  categoryId: number;
  finishedUnit: string;
  producedQuantity: number;
  type: "SEMI_FINISHED";
  price: number;
  composition: Array<{
    rawIngredientId: number;
    amount: number;
  }>;
};

export async function POST(req: NextRequest) {
  const body = await req.json() as Payload;

  const {
    name,
    categoryId,
    finishedUnit,
    producedQuantity,
    type,
    price,
    composition,
  } = body;

  if (
    !name ||
    !categoryId ||
    !finishedUnit ||
    producedQuantity === undefined ||
    !type ||
    price === undefined ||
    !composition ||
    !Array.isArray(composition)
  ) {
    return NextResponse.json(
      { message: "Missing required fields" },
      { status: 400 }
    );
  }

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // Cek nama yang sama
    const [existing] = await db.query(
      'SELECT id FROM ingredient WHERE name = ?',
      [name]
    );

    if ((existing as any[]).length > 0) {
      return NextResponse.json({ message: 'Ingredient name already exists' }, { status: 400 });
    }
    // 1. Insert semi finished ingredient
    const [insertResult] = await connection.execute(
      `
        INSERT INTO ingredient 
          (name, categoryId, finishedUnit, type, price, start, stockIn, used, wasted, stock, stockMin, unit, batchYield, isActive)
        VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, ?, 0, ?, ?, 1)
      `,
      [
        name,
        categoryId,
        finishedUnit,
        type,
        price,
        producedQuantity,
        producedQuantity,
        finishedUnit,
        producedQuantity
      ]
    );

    const newIngredientId = (insertResult as any).insertId;

    // 2. Insert ingredient compositions
    for (const comp of composition) {
      if (!comp.rawIngredientId || comp.amount === undefined) continue;

      // insert to ingredientComposition
      await connection.execute(
        `
          INSERT INTO ingredientComposition (semiIngredientId, rawIngredientId, amount)
          VALUES (?, ?, ?)
        `,
        [newIngredientId, comp.rawIngredientId, comp.amount]
      );

      // 3. Update raw ingredient stock & used
      const [rows] = await connection.execute(
        `
          SELECT start, stockIn, used, wasted
          FROM ingredient
          WHERE id = ?
        `,
        [comp.rawIngredientId]
      );
      const raw = (rows as any[])[0];
      if (raw) {
        const newUsed = raw.used + comp.amount;
        const newStock = raw.start + raw.stockIn - newUsed - raw.wasted;

        await connection.execute(
          `
            UPDATE ingredient
            SET used = ?, stock = ?
            WHERE id = ?
          `,
          [newUsed, newStock, comp.rawIngredientId]
        );
      }
    }

    await connection.commit();
    connection.release();

    return NextResponse.json({
      message: "Semi finished ingredient created successfully",
      semiIngredient: {
        id: newIngredientId,
        name,
        categoryId,
        finishedUnit,
        producedQuantity,
        type,
        price,
      },
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("Error creating semi finished ingredient:", error);
    return NextResponse.json(
      { message: "Error creating semi finished ingredient" },
      { status: 500 }
    );
  }
}
