import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { format } from 'date-fns-tz';

interface OrderDetailItem {
  menuName: string;
  quantity: number;
  modifiers: string[];
}

interface OrderDetail {
  orderId: number;
  tanggal: string; 
  totalCollected: number;
  items: OrderDetailItem[];
}

interface SalesByOrderResponse {
  summary: {
    totalCollected: number; 
    transactionCount: number;
    salesPerTransaction: number;
  };
  details: OrderDetail[]; 
}

// Helper function for ISO week start (used for date range filtering)
function getStartOfISOWeek(isoWeek: string): Date {
  const [yearStr, weekStr] = isoWeek.split("-W");
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
  const date = searchParams.get("date");
  const period = searchParams.get("period");

  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }

  let startDate: Date;
  let endDate: Date;

  if (period === "daily") {
    startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
  } else if (period === "weekly") {
    startDate = getStartOfISOWeek(date);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
  } else if (period === "monthly") {
    const [year, month] = date.split("-");
    startDate = new Date(Number(year), Number(month) - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(Number(year), Number(month), 1); // 1st day of next month
  } else if (period === "yearly") {
    const year = Number(date);
    startDate = new Date(year, 0, 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(year + 1, 0, 1);
  } else {
    startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
  }

  endDate.setHours(0, 0, 0, 0);

  try {
    const [orderItemsData] = await db.query<any[]>(`
      SELECT 
        co.id AS orderId,
        co.createdAt AS orderCreatedAt,
        co.finalTotal,
        oi.id AS orderItemId,
        oi.quantity AS itemQuantity,
        m.name AS menuName,
        (
          SELECT GROUP_CONCAT(mod_table.name SEPARATOR ', ') 
          FROM completedOrderItemModifier coim
          JOIN modifier mod_table ON coim.modifierId = mod_table.id
          WHERE coim.completedOrderItemId = oi.id
        ) AS modifierNames
      FROM completedOrder co
      JOIN completedOrderItem oi ON oi.orderId = co.id
      JOIN menu m ON m.id = oi.menuId
      WHERE co.createdAt >= ? AND co.createdAt < ? 
      ORDER BY co.id ASC, oi.id ASC
    `, [startDate, endDate]);

    // Calculate summary (overall TotalCollected, transactionCount, etc.)
    const uniqueOrdersForSummary = new Map<number, { finalTotal: number }>();
    for (const item of orderItemsData) { // Use orderItemsData for summary as well
      if (!uniqueOrdersForSummary.has(item.orderId)) {
        uniqueOrdersForSummary.set(item.orderId, { finalTotal: Number(item.finalTotal) });
      }
    }
    const summaryTotalCollected = Array.from(uniqueOrdersForSummary.values()).reduce((acc, val) => acc + val.finalTotal, 0);
    const transactionCount = uniqueOrdersForSummary.size;
    const salesPerTransaction = transactionCount > 0 ? summaryTotalCollected / transactionCount : 0;

    // Process data for the new 'details' structure (list of orders)
    const orderDetailsMap = new Map<number, OrderDetail>();

    for (const row of orderItemsData) {
      const orderId = row.orderId;
      let orderDetailEntry = orderDetailsMap.get(orderId);

      if (!orderDetailEntry) {
        orderDetailEntry = {
          orderId: orderId,
          tanggal: format(new Date(row.orderCreatedAt), 'dd/MM/yyyy, HH.mm.ss', { timeZone: 'Asia/Jakarta' }),
          totalCollected: Number(row.finalTotal),
          items: [],
        };
        orderDetailsMap.set(orderId, orderDetailEntry);
      }

      orderDetailEntry.items.push({
        menuName: row.menuName,
        quantity: Number(row.itemQuantity),
        modifiers: row.modifierNames ? row.modifierNames.split(', ').filter((m: string) => m.trim() !== '') : [],
      });
    }

    const details: OrderDetail[] = Array.from(orderDetailsMap.values());

    const response: SalesByOrderResponse = {
      summary: {
        totalCollected: summaryTotalCollected,
        transactionCount,
        salesPerTransaction,
      },
      details,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching sales detail:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}
