import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { format as formatDateFns, parse as parseDateFns, startOfWeek as startOfWeekFns, addDays as addDaysFns, startOfMonth as startOfMonthFns, endOfMonth as endOfMonthFns, startOfYear as startOfYearFns, endOfYear as endOfYearFns } from 'date-fns';

interface AppliedModifierOutput {
    modifierId: number;
    name: string;
    price: number;
}
interface OrderItemOutput {
    orderItemId: number; 
    menuName: string;
    quantity: number;
    menuUnitPrice: number;
    appliedModifiers: AppliedModifierOutput[];
}
interface OrderOutput {
    orderId: number;
    createdAt: string;
    total: number;
    items: OrderItemOutput[];
}
interface SalesDetailResponse {
    summary: {
        totalOrders: number;
        totalSales: number;
    };
    orders: OrderOutput[];
}


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateLabelFromChart = searchParams.get("date");
  const period = searchParams.get("period");

  if (!dateLabelFromChart || !period) {
    return NextResponse.json({ error: "Missing date label or period" }, { status: 400 });
  }

  let startDate: Date;
  let endDate: Date; 

  try {
    if (period === "daily") {
      startDate = new Date(dateLabelFromChart + "T00:00:00.000Z");
      endDate = addDaysFns(startDate, 1);
    } else if (period === "weekly") {
      const [yearStr, weekStr] = dateLabelFromChart.split("-W");
      const year = parseInt(yearStr);
      const week = parseInt(weekStr);
      let approxDate = new Date(Date.UTC(year, 0, 4 + (week - 1) * 7));
      startDate = startOfWeekFns(approxDate, { weekStartsOn: 1 }); 
      endDate = addDaysFns(startDate, 7);
    } else if (period === "monthly") {
      const [year, month] = dateLabelFromChart.split("-");
      startDate = new Date(Number(year), Number(month) - 1, 1);
      endDate = new Date(Number(year), Number(month), 1); 
    } else if (period === "yearly") {
      const year = Number(dateLabelFromChart);
      startDate = new Date(year, 0, 1);
      endDate = new Date(year + 1, 0, 1); 
    } else {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    const [orderRows] = await db.query<RowDataPacket[]>(
      `SELECT 
          co.id AS orderId,
          co.createdAt AS orderCreatedAt,
          co.finalTotal AS orderFinalTotal,
          coi.id AS orderItemId,
          coi.quantity AS itemQuantity,
          coi.price AS coiUnitPriceGrossCombined, -- Harga satuan di coi (menu+mods, sebelum diskon item)
          coi.discountAmount AS coiLineSpecificDiscount, -- Diskon total di baris coi
          m.name AS menuName,
          m.price AS menuMasterUnitPrice, -- Harga master menu
          coim.modifierId AS appliedModifierId,
          md.name AS appliedModifierName,
          md.price AS appliedModifierPrice
      FROM completedOrder co
      JOIN completedOrderItem coi ON co.id = coi.orderId
      JOIN menu m ON coi.menuId = m.id
      LEFT JOIN completedOrderItemModifier coim ON coi.id = coim.completedOrderItemId
      LEFT JOIN modifier md ON coim.modifierId = md.id
      WHERE co.createdAt >= ? AND co.createdAt < ?
      ORDER BY co.id, coi.id, md.id;`,
      [startDate, endDate]
    );

    const ordersMap = new Map<number, OrderOutput>();

    for (const row of orderRows) {
      const orderId = Number(row.orderId);
      let orderOutput = ordersMap.get(orderId);

      if (!orderOutput) {
        orderOutput = {
          orderId: orderId,
          createdAt: formatDateFns(new Date(row.orderCreatedAt), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
          total: Number(row.orderFinalTotal),
          items: [],
        };
        ordersMap.set(orderId, orderOutput);
      }

      const orderItemId = Number(row.orderItemId);
      let itemEntry = orderOutput.items.find(item => item.orderItemId === orderItemId);

      if (!itemEntry) {
        itemEntry = {
          orderItemId: orderItemId,
          menuName: String(row.menuName),
          quantity: Number(row.itemQuantity),
          menuUnitPrice: Number(row.menuMasterUnitPrice),
          appliedModifiers: [],
        };
        orderOutput.items.push(itemEntry);
      }

      if (row.appliedModifierId) {
        if (!itemEntry.appliedModifiers.find(m => m.modifierId === Number(row.appliedModifierId))) {
          itemEntry.appliedModifiers.push({
            modifierId: Number(row.appliedModifierId),
            name: String(row.appliedModifierName),
            price: Number(row.appliedModifierPrice),
          });
        }
      }
    }
    
    const finalOrders = Array.from(ordersMap.values());
    const summary = {
      totalOrders: finalOrders.length,
      totalSales: finalOrders.reduce((sum, order) => sum + order.total, 0),
    };
    
    const response: SalesDetailResponse = {
      summary,
      orders: finalOrders,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching sales detail:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: "Internal server error", message }, { status: 500 });
  }
}
