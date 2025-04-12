import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';

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
      result.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    } else if (period === 'weekly') {
      const year = current.getFullYear();
      const week = getWeekNumber(current);
      result.push(`${year}-W${String(week).padStart(2, '0')}`);
      current.setDate(current.getDate() + 7);
    } else if (period === 'monthly') {
      result.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
      current.setMonth(current.getMonth() + 1);
    } else if (period === 'yearly') {
      result.push(`${current.getFullYear()}`);
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

  // Handle dynamic period like "daily-prev", "weekly-prev", etc.
  if (!startDate && dateParam && period) {
    const isPrev = period.endsWith('-prev');
    const basePeriod = period.replace('-prev', '');
    const baseDate = new Date(dateParam);
    period = basePeriod;

    switch (basePeriod) {
      case 'daily':
        startDate = new Date(baseDate);
        if (isPrev) startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(startDate);
        break;

      case 'weekly':
        const day = baseDate.getDay() || 7;
        startDate = new Date(baseDate);
        startDate.setDate(startDate.getDate() - day + 1);
        if (isPrev) startDate.setDate(startDate.getDate() - 7);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;

      case 'monthly':
        startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
        if (isPrev) startDate.setMonth(startDate.getMonth() - 1);
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        break;

      case 'yearly':
        startDate = new Date(baseDate.getFullYear(), 0, 1);
        if (isPrev) startDate.setFullYear(startDate.getFullYear() - 1);
        endDate = new Date(startDate.getFullYear(), 11, 31);
        break;
    }
  }

  if (endDate) {
    endDate.setHours(23, 59, 59, 999);
  }

  let query = '';
  let values: any[] = [];
  let mapFn: (item: any) => SalesPerTransactionData;

  try {
    switch (period) {
      case 'daily':
        query = `
          SELECT 
            DATE_FORMAT(createdAt, '%Y-%m-%d') AS label,
            COUNT(*) as transactionCount,
            SUM(finalTotal) as netSales
          FROM CompletedOrder
          WHERE (? IS NULL OR createdAt >= ?)
            AND (? IS NULL OR createdAt <= ?)
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
          FROM CompletedOrder
          WHERE (? IS NULL OR createdAt >= ?)
            AND (? IS NULL OR createdAt <= ?)
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
          FROM CompletedOrder
          WHERE (? IS NULL OR createdAt >= ?)
            AND (? IS NULL OR createdAt <= ?)
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
          FROM CompletedOrder
          WHERE (? IS NULL OR createdAt >= ?)
            AND (? IS NULL OR createdAt <= ?)
          GROUP BY label
          ORDER BY label
        `;
        break;

      default:
        return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
    }

    values = [startDate, startDate, endDate, endDate];

    const [rows] = await db.query<RowDataPacket[]>(query, values);
    const rawResult = rows.map((item: any) => ({
      date: item.label,
      salesPerTransaction: Number(item.netSales) / Number(item.transactionCount),
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
