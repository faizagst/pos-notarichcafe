import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name,
    start,
    warehouseStart,
    stockIn,
    used,
    wasted,
    stockMin,
    unit,
    finishedUnit,
    categoryId,
    type,
    price,
  } = body;

  // Validasi sederhana
  if (
    !name ||
    start === undefined ||
    warehouseStart === undefined ||
    stockIn === undefined ||
    used === undefined ||
    wasted === undefined ||
    stockMin === undefined ||
    !unit ||
    !finishedUnit ||
    !categoryId ||
    !type ||
    price === undefined
  ) {
    return NextResponse.json(
      { message: 'Missing required fields' },
      { status: 400 }
    );
  }

  const calculatedStock =
    Number(start) + Number(stockIn) - Number(used) - Number(wasted);
  const calculatedGudangStock =
    Number(warehouseStart) + Number(stockIn) - Number(used) - Number(wasted);

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    // Insert ke tabel ingredient
    const [ingredientResult]: any = await conn.query(
      `INSERT INTO ingredient (name, start, stockIn, used, wasted, stock, stockMin, unit, finishedUnit, categoryId, type, price, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        Number(start),
        Number(stockIn),
        Number(used),
        Number(wasted),
        calculatedStock,
        Number(stockMin),
        unit,
        finishedUnit,
        categoryId,
        type,
        parseFloat(price),
        true,
      ]
    );

    const ingredientId = ingredientResult.insertId;

    // Insert ke tabel gudang
    const [gudangResult]: any = await conn.query(
      `INSERT INTO gudang (ingredientId, name, start, stockIn, used, wasted, stock, stockMin, unit, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ingredientId,
        name,
        Number(warehouseStart),
        0, // default stockIn gudang saat create
        0,
        0,
        calculatedGudangStock,
        Number(stockMin),
        unit,
        true,
      ]
    );

    await conn.commit();
    conn.release();

    return NextResponse.json(
      {
        message: 'Ingredient dan Gudang berhasil dibuat',
        ingredient: {
          id: ingredientId,
          name,
          start,
          stockIn,
          used,
          wasted,
          stock: calculatedStock,
          stockMin,
          unit,
          finishedUnit,
          categoryId,
          type,
          price,
          isActive: true,
        },
        gudang: {
          id: gudangResult.insertId,
          ingredientId,
          name,
          start: warehouseStart,
          stockIn: 0,
          used: 0,
          wasted: 0,
          stock: calculatedGudangStock,
          stockMin,
          unit,
          isActive: true,
        },
        toast: {
          type: 'success',
          color: 'green',
          text: 'Ingredient berhasil dibuat!',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    await conn.rollback();
    conn.release();
    console.error('Error creating ingredient:', error);
    return NextResponse.json(
      { message: 'Error creating ingredient' },
      { status: 500 }
    );
  }
}
