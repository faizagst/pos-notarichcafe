import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate) {
    return NextResponse.json(
      { error: "Query parameter 'startDate' diperlukan." },
      { status: 400 }
    );
  }

  const parsedStartDate = new Date(startDate);
  parsedStartDate.setHours(0, 0, 0, 0);

  let parsedEndDate: Date;
  if (!endDate) {
    parsedEndDate = new Date(startDate);
    parsedEndDate.setHours(23, 59, 59, 999);
  } else {
    parsedEndDate = new Date(endDate);
    parsedEndDate.setHours(23, 59, 59, 999);
  }

  try {
    const conn = await db.getConnection();

    // Ambil stok awal pada hari pertama
    const [startStocks] = await conn.query(
      `
      SELECT ingredientId, ingredientName, SUM(start) as start
      FROM dailyIngredientStock
      WHERE date BETWEEN ? AND ?
      GROUP BY ingredientId, ingredientName
      `,
      [
        parsedStartDate,
        new Date(
          parsedStartDate.getFullYear(),
          parsedStartDate.getMonth(),
          parsedStartDate.getDate(),
          23, 59, 59, 999
        )
      ]
    );

    // Ambil total stokIn, used, wasted dalam rentang tanggal
    const [periodStocks] = await conn.query(
      `
      SELECT ingredientId, ingredientName,
             SUM(stockIn) as stockIn,
             SUM(used) as used,
             SUM(wasted) as wasted
      FROM dailyIngredientStock
      WHERE date BETWEEN ? AND ?
      GROUP BY ingredientId, ingredientName
      `,
      [parsedStartDate, parsedEndDate]
    );

    conn.release();

    const result = (periodStocks as any[]).map((periodStock) => {
      const startStock = (startStocks as any[]).find(
        (s) => s.ingredientId === periodStock.ingredientId
      );

      const start = Number(startStock?.start || 0);
      const stockIn = Number(periodStock.stockIn || 0);
      const used = Number(periodStock.used || 0);
      const wasted = Number(periodStock.wasted || 0);
      const stock = start + stockIn - used - wasted;

      return {
        ingredient: {
          id: periodStock.ingredientId,
          name: periodStock.ingredientName,
        },
        start,
        stockIn,
        used,
        wasted,
        stock,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error retrieving daily ingredient stock:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
