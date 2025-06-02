import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { format } from 'date-fns-tz';

interface GrossMarginData {
  date: string;
  grossMargin: number;
  netSales: number;
  hpp: number;
}

function getWeekNumber(d: Date): number {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target as any) - (yearStart as any)) / 86400000 + 1) / 7);
}

function generateDateRange(period: string, start: Date, end: Date): string[] {
  const result: string[] = [];
  const current = new Date(start);

  while (current <= end) {
    if (period === 'daily') {
      result.push(format(current, 'yyyy-MM-dd', { timeZone: 'Asia/Jakarta' }));
      current.setDate(current.getDate() + 1);
    } else if (period === 'weekly') {
      const week = getWeekNumber(current);
      const year = current.getFullYear();
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

function getRangeForPeriod(period: string, date: Date): { startDate: Date; endDate: Date } {
  const base = new Date(date);
  let startDate = new Date(base);
  let endDate = new Date(base);

  switch (period) {
    case 'daily':
      startDate.setDate(base.getDate() - 3);
      break;
    case 'weekly':
      const day = base.getDay() || 7;
      base.setDate(base.getDate() - day + 1); // awal minggu
      startDate = new Date(base);
      startDate.setDate(startDate.getDate() - 21); // 3 minggu sebelumnya
      endDate = new Date(base);
      endDate.setDate(endDate.getDate() + 6);
      break;
    case 'monthly':
      startDate = new Date(base.getFullYear(), base.getMonth() - 3, 1);
      endDate = new Date(base.getFullYear(), base.getMonth() + 1, 0);
      break;
    case 'yearly':
      startDate = new Date(base.getFullYear() - 1, 0, 1);
      endDate = new Date(base.getFullYear(), 11, 31);
      break;
    default:
      throw new Error('Invalid period');
  }

  return { startDate, endDate };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let period = searchParams.get('period')!;
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const dateParam = searchParams.get('date');

  let startDate = start ? new Date(start) : null;
  let endDate = end ? new Date(end) : null;

  if (dateParam && period) {
    const baseDate = new Date(dateParam);
    ({ startDate, endDate } = getRangeForPeriod(period, baseDate));
  }

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  const values = [startDate, startDate, endDate, endDate];

  const dateLabel = (() => {
    switch (period) {
      case 'daily':
        return `DATE_FORMAT(co.createdAt, '%Y-%m-%d')`;
      case 'weekly':
        return `DATE_FORMAT(DATE_SUB(co.createdAt, INTERVAL WEEKDAY(co.createdAt) DAY), '%Y-W%v')`;
      case 'monthly':
        return `DATE_FORMAT(co.createdAt, '%Y-%m')`;
      case 'yearly':
        return `DATE_FORMAT(co.createdAt, '%Y')`;
      default:
        throw new Error('Invalid period');
    }
  })();

  try {
    const query = `
      SELECT 
        label,
        SUM(order_net_sales) AS netSales,
        SUM(order_hpp) AS hpp
      FROM (
        SELECT 
          ${dateLabel} AS label,
          (co.total - co.discountAmount) AS order_net_sales,
          SUM(
            (m.hargaBakul * ci.quantity) +
            COALESCE((
              SELECT SUM(ing.price * mi.amount)
              FROM completedOrderItemModifier cim
              JOIN modifierIngredient mi ON cim.modifierId = mi.modifierId
              JOIN ingredient ing ON mi.ingredientId = ing.id
              WHERE cim.completedOrderItemId = ci.id
            ) * ci.quantity, 0)
          ) AS order_hpp
        FROM completedOrder co
        JOIN completedOrderItem ci ON co.id = ci.orderId
        JOIN menu m ON ci.menuId = m.id
        WHERE (? IS NULL OR co.createdAt >= ?)
          AND (? IS NULL OR co.createdAt <= ?)
        GROUP BY co.id
      ) AS sub
      GROUP BY label
      ORDER BY label
    `;

    const [rows] = await db.query<RowDataPacket[]>(query, values);

    const resultMap = new Map<string, GrossMarginData>();

    rows.forEach(row => {
      const netSales = Number(row.netSales) || 0;
      const hpp = Number(row.hpp) || 0;
      resultMap.set(row.label, {
        date: row.label,
        netSales,
        hpp,
        grossMargin: netSales > 0 ? ((netSales - hpp) / netSales) * 100 : 0,
      });
    });

    const dateKeys = generateDateRange(period, startDate, endDate);

    const result: GrossMarginData[] = dateKeys.map(key => {
      const item = resultMap.get(key);
      return {
        date: key,
        grossMargin: item?.grossMargin ?? 0,
        netSales: item?.netSales ?? 0,
        hpp: item?.hpp ?? 0,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Gross Margin error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
