import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const tableNumber = searchParams.get('tableNumber');
  const paymentMethod = searchParams.get('paymentMethod');
  const minTotal = searchParams.get('minTotal');
  const maxTotal = searchParams.get('maxTotal');

  const conditions: string[] = [];
  const values: any[] = [];

  if (startDate) {
    conditions.push('createdAt >= ?');
    values.push(`${startDate}T00:00:00.000Z`);
  }
  if (endDate) {
    conditions.push('createdAt <= ?');
    values.push(`${endDate}T23:59:59.999Z`);
  }
  if (tableNumber) {
    conditions.push('tableNumber = ?');
    values.push(tableNumber);
  }
  if (paymentMethod) {
    conditions.push('paymentMethod = ?');
    values.push(paymentMethod);
  }
  if (minTotal) {
    conditions.push('total >= ?');
    values.push(parseFloat(minTotal));
  }
  if (maxTotal) {
    conditions.push('total <= ?');
    values.push(parseFloat(maxTotal));
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [orders] = await db.query(
      `
      SELECT * FROM completedOrder
      ${whereClause}
      ORDER BY createdAt DESC
      `,
      values
    );

    const orderIds = (orders as any[]).map((order) => order.id);

    let orderItems: any[] = [];
    let modifiers: any[] = [];

    if (orderIds.length > 0) {
      const orderPlaceholders = orderIds.map(() => '?').join(', ');
      const [items] = await db.query(
        `
        SELECT oi.*, m.name AS menuName
        FROM completedOrderItem oi
        JOIN menu m ON oi.menuId = m.id
        WHERE oi.orderId IN (${orderPlaceholders})
        `,
        orderIds
      );
      orderItems = items as any[];

      const orderItemIds = orderItems.map((item) => item.id);
      if (orderItemIds.length > 0) {
        const modPlaceholders = orderItemIds.map(() => '?').join(', ');
        const [mods] = await db.query(
          `
          SELECT om.*, md.name, md.price
          FROM completedOrderItemModifier om
          JOIN modifier md ON om.modifierId = md.id
          WHERE om.completedOrderItemId IN (${modPlaceholders})
          `,
          orderItemIds
        );
        modifiers = mods as any[];
      }
    }

    const itemsByOrderId: Record<number, any[]> = {};
    for (const item of orderItems) {
      const itemModifiers = modifiers.filter((mod) => mod.completedOrderItemId === item.id);
      if (!itemsByOrderId[item.orderId]) itemsByOrderId[item.orderId] = [];

      itemsByOrderId[item.orderId].push({
        id: item.id,
        menuName: item.menuName,
        quantity: item.quantity,
        note: item.note,
        modifiers: itemModifiers.map((mod) => ({
          id: mod.id,
          modifierId: mod.modifierId,
          name: mod.name,
          price: mod.price,
        })),
      });
    }

    const transformedOrders = (orders as any[]).map((order) => ({
      id: order.id,
      tableNumber: order.tableNumber,
      total: order.total,
      discountAmount: order.discountAmount,
      taxAmount: order.taxAmount,
      gratuityAmount: order.gratuityAmount,
      paymentMethod: order.paymentMethod,
      paymentId: order.paymentId,
      createdAt: new Date(order.createdAt).toISOString(),
      orderItems: itemsByOrderId[order.id] || [],
    }));

    return NextResponse.json({ orders: transformedOrders });
  } catch (error) {
    console.error('Error fetching completed orders:', error);
    return NextResponse.json(
      {
        message: 'Gagal mengambil data riwayat pesanan',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
