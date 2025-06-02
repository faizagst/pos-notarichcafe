import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const today = new Date();
    const todayDate = today.toISOString().split("T")[0];

    // Cek apakah reset sudah dilakukan hari ini
    const [alreadyReset] = await connection.execute(
      `SELECT COUNT(*) as count FROM dailyIngredientStock WHERE DATE(date) = ?`,
      [todayDate]
    ) as any[];

    if (alreadyReset[0].count > 0) {
      connection.release();
      return NextResponse.json(
        { message: "Stok hari ini sudah di-reset." },
        { status: 400 }
      );
    }

    // Ambil semua data ingredient
    const [ingredients] = await connection.execute(`
      SELECT id, name, start, stockIn, used, wasted, stock, stockMin FROM ingredient
    `) as any[];

    for (const ingredient of ingredients) {
      // Simpan snapshot
      await connection.execute(
        `
        INSERT INTO dailyIngredientStock 
          (date, ingredientId, ingredientName, start, stockIn, used, wasted, stock, stockMin)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          todayDate,
          ingredient.id,
          ingredient.name,
          ingredient.start,
          ingredient.stockIn,
          ingredient.used,
          ingredient.wasted,
          ingredient.stock,
          ingredient.stockMin,
        ]
      );

      // Reset transaksi harian
      await connection.execute(
        `
        UPDATE ingredient 
        SET start = ?, stockIn = 0, used = 0, wasted = 0, stock = ?, stockMin = ? 
        WHERE id = ?
        `,
        [ingredient.stock, ingredient.stock, ingredient.stockMin, ingredient.id]
      );
    }

    await connection.commit();
    connection.release();

    return NextResponse.json({
      message: "Daily stock reset successful and history saved."
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("Error resetting daily stock:", error);
    return NextResponse.json(
      { message: "Failed to reset daily stock" },
      { status: 500 }
    );
  }
}
