import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

type PayloadUpdate = {
  name: string;
  categoryId: number;
  finishedUnit: string;
  stockIn: number;
  wasted: number;
  stockMin: number;
  type: 'SEMI_FINISHED';
  price: number;
  composition: Array<{
    rawIngredientId: number;
    amount: number;
  }>;
};

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ message: 'Invalid ingredient id' }, { status: 400 });
  }
  const ingredientId = Number(id);

  const body = await req.json();
  const {
    name,
    categoryId,
    finishedUnit,
    stockIn,
    wasted,
    stockMin,
    type,
    price,
    composition,
  }: PayloadUpdate = body;

  if (
    !name ||
    !categoryId ||
    !finishedUnit ||
    stockIn === undefined ||
    wasted === undefined ||
    stockMin === undefined ||
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
    // Cek apakah nama sudah dipakai oleh bahan lain
    const [existingRows]: any = await connection.query(
      'SELECT id FROM ingredient WHERE name = ? AND id != ?',
      [name, ingredientId]
    );
    if (existingRows.length > 0) {
      return NextResponse.json({ message: 'Ingredient name already exists' }, { status: 409 });
    }

    // Ambil data lama untuk perhitungan
    const [ingredientRows]: any = await connection.query(
      `SELECT start, stockIn AS oldStockIn, used, wasted, stock FROM ingredient WHERE id = ?`,
      [ingredientId]
    );
    if (ingredientRows.length === 0) {
      return NextResponse.json({ message: 'Ingredient not found' }, { status: 404 });
    }

    const old = ingredientRows[0];
    const newStockIn = old.oldStockIn + stockIn;
    const totalWasted = wasted;
    const isProducing = stockIn > 0;

    // Hitung stock baru
    let newStock = old.start + newStockIn - old.used - totalWasted;
    if (newStock < 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json({ message: 'Stock result cannot be negative' }, { status: 400 });
    }

    // Update ingredient
    await connection.execute(
      `UPDATE ingredient SET 
        name = ?, 
        categoryId = ?, 
        finishedUnit = ?, 
        type = ?, 
        price = ?, 
        stockIn = ?, 
        wasted = ?, 
        stockMin = ?, 
        stock = ?, 
        unit = ?, 
        batchYield = ?, 
        isActive = true 
      WHERE id = ?`,
      [
        name,
        categoryId,
        finishedUnit,
        type,
        price,
        newStockIn,
        totalWasted,
        stockMin,
        newStock,
        finishedUnit,
        newStockIn,
        ingredientId,
      ]
    );

    // Hapus komposisi lama
    await connection.execute(
      `DELETE FROM ingredientComposition WHERE semiIngredientId = ?`,
      [ingredientId]
    );

    // Tambahkan komposisi baru
    for (const comp of composition) {
      if (!comp.rawIngredientId || comp.amount === undefined) continue;

      await connection.execute(
        `INSERT INTO ingredientComposition (semiIngredientId, rawIngredientId, amount) VALUES (?, ?, ?)`,
        [ingredientId, comp.rawIngredientId, comp.amount]
      );

      // Jika produksi, kurangi stock bahan baku
      if (isProducing && stockIn > 0) {
        const [raws]: any = await connection.query(
          `SELECT start, stockIn, used, wasted FROM ingredient WHERE id = ?`,
          [comp.rawIngredientId]
        );
        const raw = raws[0];
        if (!raw) continue;

        const usedAddition = comp.amount * stockIn;
        const newUsed = raw.used + usedAddition;
        const newRawStock = raw.start + raw.stockIn - newUsed - raw.wasted;

        if (newRawStock < 0) {
          await connection.rollback();
          connection.release();
          return NextResponse.json({
            message: `Stock for raw ingredient ID ${comp.rawIngredientId} would be negative (used ${usedAddition} > available stock)`,
          }, { status: 400 });
        }

        await connection.execute(
          `UPDATE ingredient SET used = ?, stock = ? WHERE id = ?`,
          [newUsed, newRawStock, comp.rawIngredientId]
        );
      }

    }

    await connection.commit();
    connection.release();

    return NextResponse.json({ message: 'Semi finished ingredient updated successfully' });
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
