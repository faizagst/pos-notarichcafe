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

    // Ambil stok awal pada hari pertama untuk gudang yang aktif
    const [startStocks] = await conn.query(
      `
      SELECT g.id AS gudangId, g.name AS gudangName, SUM(dgs.start) AS start
      FROM dailyGudangStock dgs
      JOIN gudang g ON g.id = dgs.gudangId
      WHERE dgs.date BETWEEN ? AND ?
        AND g.isActive = 1
      GROUP BY g.id, g.name
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

    // Ambil stok periode dalam range tanggal
    const [periodStocks] = await conn.query(
      `
      SELECT g.id AS gudangId, g.name AS gudangName,
             SUM(dgs.stockIn) AS stockIn,
             SUM(dgs.used) AS used,
             SUM(dgs.wasted) AS wasted
      FROM dailyGudangStock dgs
      JOIN gudang g ON g.id = dgs.gudangId
      WHERE dgs.date BETWEEN ? AND ?
        AND g.isActive = 1
      GROUP BY g.id, g.name
      `,
      [parsedStartDate, parsedEndDate]
    );

    conn.release();

    const result = (periodStocks as any[]).map((periodStock) => {
      const startStock = (startStocks as any[]).find(
        (s) => s.gudangId === periodStock.gudangId
      );

      const start = Number(startStock?.start || 0);
      const stockIn = Number(periodStock.stockIn || 0);
      const used = Number(periodStock.used || 0);
      const wasted = Number(periodStock.wasted || 0);
      const stock = start + stockIn - used - wasted;

      return {
        gudang: {
          id: periodStock.gudangId,
          name: periodStock.gudangName,
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
    console.error('Error retrieving daily gudang stock:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
