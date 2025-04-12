import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

function getStartOfISOWeek(isoWeek: string): Date {
  const [yearStr, weekStr] = isoWeek.split('-W');
  const year = Number(yearStr);
  const week = Number(weekStr);
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = new Date(simple);
  if (dow === 0) {
    ISOweekStart.setDate(simple.getDate() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() - dow + 1);
  }
  return ISOweekStart;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const period = searchParams.get('period');

  if (!date) {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 });
  }

  let startDate: Date;
  let endDate: Date;

  if (period === 'daily') {
    startDate = new Date(date);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
  } else if (period === 'weekly') {
    startDate = getStartOfISOWeek(date);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
  } else if (period === 'monthly') {
    const [year, month] = date.split('-');
    startDate = new Date(Number(year), Number(month) - 1, 1);
    endDate = new Date(Number(year), Number(month), 1);
  } else if (period === 'yearly') {
    const year = Number(date);
    startDate = new Date(year, 0, 1);
    endDate = new Date(year + 1, 0, 1);
  } else {
    startDate = new Date(date);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
  }

  try {
    // 1. Fetch order + item + menu
    const [orders] = await db.query<any[]>(`
      SELECT 
        co.id AS orderId,
        co.finalTotal,
        oi.quantity,
        m.id AS menuId,
        m.name AS menuName,
        m.price AS menuPrice
      FROM CompletedOrder co
      JOIN OrderItem oi ON oi.orderId = co.id
      JOIN Menu m ON m.id = oi.menuId
      WHERE co.createdAt >= ? AND co.createdAt < ?
    `, [startDate, endDate]);

    // 2. Calculate netSales, transactionCount, salesPerTransaction
    const uniqueOrders = new Map<number, number>();
    for (const order of orders) {
      if (!uniqueOrders.has(order.orderId)) {
        uniqueOrders.set(order.orderId, Number(order.finalTotal));
      }
    }

    const netSales = Array.from(uniqueOrders.values()).reduce((acc, val) => acc + val, 0);
    const transactionCount = uniqueOrders.size;
    const salesPerTransaction = transactionCount > 0 ? netSales / transactionCount : 0;

    // 3. Build menu detail summary
    const detailMap = new Map<number, {
      menuName: string;
      sellingPrice: number;
      quantity: number;
      totalSales: number;
    }>();

    for (const item of orders) {
      const key = item.menuId;
      if (!detailMap.has(key)) {
        detailMap.set(key, {
          menuName: item.menuName,
          sellingPrice: item.menuPrice,
          quantity: item.quantity,
          totalSales: item.menuPrice * item.quantity,
        });
      } else {
        const existing = detailMap.get(key)!;
        existing.quantity += item.quantity;
        existing.totalSales += item.menuPrice * item.quantity;
      }
    }

    const details = Array.from(detailMap.values());

    return NextResponse.json({
      summary: {
        netSales,
        transactionCount,
        salesPerTransaction,
      },
      details,
    });
  } catch (error) {
    console.error('Error fetching sales detail:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
