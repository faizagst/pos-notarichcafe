import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

type PayloadUpdate = {
  name: string;
  categoryId: number;
  finishedUnit: string;
  producedQuantity: number;
  type: 'SEMI_FINISHED';
  price: number;
  composition: Array<{
    rawIngredientId: number;
    amount: number;
  }>;
};

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ message: 'Invalid ingredient id' }, { status: 400 });
  }
  const ingredientId = Number(id);

  const body = await req.json();
  const {
    name,
    categoryId,
    finishedUnit,
    producedQuantity,
    type,
    price,
    composition,
  }: PayloadUpdate = body;

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
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // Update data ingredient
    await connection.execute(
      `UPDATE ingredient SET name = ?, categoryId = ?, finishedUnit = ?, type = ?, price = ?, start = ?, stockIn = 0, used = 0, wasted = 0, stock = ?, stockMin = 0, unit = ?, batchYield = ?, isActive = true WHERE id = ?`,
      [
        name,
        categoryId,
        finishedUnit,
        type,
        price,
        producedQuantity,
        producedQuantity,
        finishedUnit,
        producedQuantity,
        ingredientId,
      ]
    );

    // Hapus komposisi lama
    await connection.execute(
      `DELETE FROM ingredientComposition WHERE semiIngredientId = ?`,
      [ingredientId]
    );

    // Tambahkan komposisi baru dan update stok masing-masing bahan raw
    for (const comp of composition) {
      if (!comp.rawIngredientId || comp.amount === undefined) continue;

      // Insert komposisi baru
      await connection.execute(
        `INSERT INTO ingredientComposition (semiIngredientId, rawIngredientId, amount) VALUES (?, ?, ?)`,
        [ingredientId, comp.rawIngredientId, comp.amount]
      );

      // Ambil data bahan baku lama
      const [raws] = await connection.execute(
        `SELECT start, stockIn, used, wasted FROM ingredient WHERE id = ?`,
        [comp.rawIngredientId]
      );
      const raw:any = Array.isArray(raws) ? raws[0] : null;

      if (raw) {
        const newUsed = raw.used + comp.amount;
        const newStock = raw.start + raw.stockIn - newUsed - raw.wasted;

        await connection.execute(
          `UPDATE ingredient SET used = ?, stock = ? WHERE id = ?`,
          [newUsed, newStock, comp.rawIngredientId]
        );
      }
    }

    await connection.commit();
    connection.release();

    return NextResponse.json({
      message: 'Semi finished ingredient updated successfully',
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error updating semi finished ingredient:', error);
    return NextResponse.json(
      { message: 'Error updating semi finished ingredient' },
      { status: 500 }
    );
  }
}
