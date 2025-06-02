import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { format } from 'date-fns-tz';

interface SalesData {
  date: string;
  total: number;
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
  const period = searchParams.get('period');
  const dateParam = searchParams.get('date');
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');

  if (!period) {
    return NextResponse.json({ error: 'Missing period parameter' }, { status: 400 });
  }

  let startDate: Date;
  let endDate: Date;

  if (period === 'daily' && startParam && endParam) {
    startDate = new Date(startParam);
    endDate = new Date(endParam);
  } else if (dateParam) {
    const baseDate = new Date(dateParam);
    let periodsBack = 3;
    if (period === 'yearly') periodsBack = 1;

    switch (period) {
      case 'daily':
        startDate = new Date(baseDate);
        startDate.setDate(startDate.getDate() - periodsBack);
        endDate = new Date(baseDate);
        break;

      case 'weekly':
        const baseDay = baseDate.getDay() || 7;
        endDate = new Date(baseDate);
        endDate.setDate(endDate.getDate() - baseDay + 1);
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 7 * periodsBack);
        endDate.setDate(endDate.getDate() + 6);
        break;

      case 'monthly':
        startDate = new Date(baseDate.getFullYear(), baseDate.getMonth() - periodsBack, 1);
        endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
        break;

      case 'yearly':
        startDate = new Date(baseDate.getFullYear() - periodsBack, 0, 1);
        endDate = new Date(baseDate.getFullYear(), 11, 31);
        break;

      default:
        return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: 'Missing date or start/end parameter' }, { status: 400 });
  }

  // Validasi tanggal
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  // Normalisasi jam
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  let query = '';
  switch (period) {
    case 'daily':
      query = `
        SELECT DATE_FORMAT(createdAt, '%Y-%m-%d') AS label, SUM(finalTotal) AS total
        FROM completedOrder
        WHERE createdAt BETWEEN ? AND ?
        GROUP BY label
        ORDER BY label
      `;
      break;

    case 'weekly':
      query = `
        SELECT DATE_FORMAT(DATE_SUB(createdAt, INTERVAL WEEKDAY(createdAt) DAY), '%Y-W%v') AS label, SUM(finalTotal) AS total
        FROM completedOrder
        WHERE createdAt BETWEEN ? AND ?
        GROUP BY label
        ORDER BY label
      `;
      break;

    case 'monthly':
      query = `
        SELECT DATE_FORMAT(createdAt, '%Y-%m') AS label, SUM(finalTotal) AS total
        FROM completedOrder
        WHERE createdAt BETWEEN ? AND ?
        GROUP BY label
        ORDER BY label
      `;
      break;

    case 'yearly':
      query = `
        SELECT DATE_FORMAT(createdAt, '%Y') AS label, SUM(finalTotal) AS total
        FROM completedOrder
        WHERE createdAt BETWEEN ? AND ?
        GROUP BY label
        ORDER BY label
      `;
      break;
  }

  try {
    const [rows] = await db.query<RowDataPacket[]>(query, [startDate, endDate]);

    const rawResult = rows.map(row => ({
      date: row.label,
      total: Number(row.total),
    }));

    const defaultKeys = generateDateRange(period, startDate, endDate);
    const resultMap = new Map(rawResult.map(item => [item.date, item]));
    const result: SalesData[] = defaultKeys.map(date => ({
      date,
      total: resultMap.get(date)?.total ?? 0,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching sales data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
