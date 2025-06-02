import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { format } from 'date-fns-tz';

interface SalesPerTransactionData {
  date: string;
  salesPerTransaction: number;
}

function getWeekNumber(d: Date): number {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d as any) - (yearStart as any)) / 86400000 + 1) / 7);
}

function generateDateRange(period: string, start: Date, end: Date): string[] {
  const result: string[] = [];
  const current = new Date(start);

  while (current <= end) {
    if (period === 'daily') {
      result.push(format(current, 'yyyy-MM-dd', { timeZone: 'Asia/Jakarta' }));
      current.setDate(current.getDate() + 1);
    } else if (period === 'weekly') {
      const year = current.getFullYear();
      const week = getWeekNumber(current);
      result.push(`${year}-W${String(week).padStart(2, '0')}`);
      current.setDate(current.getDate() + 7);
    } else if (period === 'monthly') {
      result.push(format(current, 'yyyy-MM', { timeZone: 'Asia/Jakarta' }));
      current.setMonth(current.getMonth() + 1);
    } else if (period === 'yearly') {
      result.push(format(current, 'yyyy', { timeZone: 'Asia/Jakarta' }));
      current.setFullYear(current.getFullYear() + 1);
    }
  }

  return result;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let period = searchParams.get('period')!;
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const dateParam = searchParams.get('date');

  let startDate = start ? new Date(start) : null;
  let endDate = end ? new Date(end) : null;

  if (!startDate && dateParam && period) {
    const baseDate = new Date(dateParam);
    let range = 3; // default for daily, weekly, monthly
    if (period === 'yearly') range = 1;

    switch (period) {
      case 'daily':
        startDate = new Date(baseDate);
        startDate.setDate(startDate.getDate() - range);
        endDate = new Date(baseDate);
        break;

      case 'weekly':
        const baseDay = baseDate.getDay() || 7;
        const endWeek = new Date(baseDate);
        endWeek.setDate(endWeek.getDate() - baseDay + 1 + 6); // End of week
        endDate = endWeek;

        const startWeek = new Date(endWeek);
        startWeek.setDate(startWeek.getDate() - range * 7);
        startDate = startWeek;
        break;

      case 'monthly':
        startDate = new Date(baseDate.getFullYear(), baseDate.getMonth() - range, 1);
        endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
        break;

      case 'yearly':
        startDate = new Date(baseDate.getFullYear() - range, 0, 1);
        endDate = new Date(baseDate.getFullYear(), 11, 31);
        break;

      default:
        return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
    }
  }

  if (startDate) startDate.setHours(0, 0, 0, 0);
  if (endDate) endDate.setHours(23, 59, 59, 999);

  let query = '';
  try {
    switch (period) {
      case 'daily':
        query = `
          SELECT 
            DATE_FORMAT(createdAt, '%Y-%m-%d') AS label,
            COUNT(*) as transactionCount,
            SUM(finalTotal) as netSales
          FROM completedOrder
          WHERE createdAt BETWEEN ? AND ?
          GROUP BY label
          ORDER BY label
        `;
        break;

      case 'weekly':
        query = `
          SELECT 
            DATE_FORMAT(DATE_SUB(createdAt, INTERVAL WEEKDAY(createdAt) DAY), '%Y-W%v') AS label,
            COUNT(*) as transactionCount,
            SUM(finalTotal) as netSales
          FROM completedOrder
          WHERE createdAt BETWEEN ? AND ?
          GROUP BY label
          ORDER BY label
        `;
        break;

      case 'monthly':
        query = `
          SELECT 
            DATE_FORMAT(createdAt, '%Y-%m') AS label,
            COUNT(*) as transactionCount,
            SUM(finalTotal) as netSales
          FROM completedOrder
          WHERE createdAt BETWEEN ? AND ?
          GROUP BY label
          ORDER BY label
        `;
        break;

      case 'yearly':
        query = `
          SELECT 
            DATE_FORMAT(createdAt, '%Y') AS label,
            COUNT(*) as transactionCount,
            SUM(finalTotal) as netSales
          FROM completedOrder
          WHERE createdAt BETWEEN ? AND ?
          GROUP BY label
          ORDER BY label
        `;
        break;
    }

    const [rows] = await db.query<RowDataPacket[]>(query, [startDate, endDate]);

    const rawResult = rows.map(row => ({
      date: row.label,
      salesPerTransaction: Number(row.transactionCount) === 0 ? 0 : Number(row.netSales) / Number(row.transactionCount),
    }));

    const defaultKeys = generateDateRange(period, startDate!, endDate!);
    const resultMap = new Map(rawResult.map(item => [item.date, item]));
    const result: SalesPerTransactionData[] = defaultKeys.map(date => ({
      date,
      salesPerTransaction: resultMap.get(date)?.salesPerTransaction ?? 0,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching sales per transaction data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
