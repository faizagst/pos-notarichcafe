import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export async function POST(req: NextRequest) {
  try {
    const { orderId, paymentMethod, paymentStatus, paymentId, status } = await req.json();

    if (!orderId || !paymentMethod || !paymentStatus) {
      return NextResponse.json({ message: "Order ID, payment method, dan status wajib diisi" }, { status: 400 });
    }

    const conn = await db.getConnection();
    try {
      const [updatedOrderRows] = await conn.query<ResultSetHeader>(
        `UPDATE \`order\`
         SET paymentMethod = ?, paymentStatus = ?, paymentId = ?, status = ?
         WHERE id = ?`,
        [paymentMethod, paymentStatus, paymentId, status || "pending", orderId]
      );

      if (updatedOrderRows.affectedRows === 0) {
        return NextResponse.json({ message: "Order not found" }, { status: 404 });
      }

      const [updatedOrder] = await conn.query<RowDataPacket[]>(
        `SELECT * FROM \`order\` WHERE id = ?`,
        [orderId]
      );

      const [orderItems] = await conn.query<RowDataPacket[]>(
        `SELECT oi.*, m.*, GROUP_CONCAT(DISTINCT mod.name) AS modifiers 
         FROM order_item oi
         LEFT JOIN menu m ON oi.menuId = m.id
         LEFT JOIN order_item_modifier oim ON oi.id = oim.orderItemId
         LEFT JOIN modifier mod ON oim.modifierId = mod.id
         WHERE oi.orderId = ?
         GROUP BY oi.id`,
        [orderId]
      );

      const [discount] = await conn.query<RowDataPacket[]>(
        `SELECT * FROM discount WHERE id = ?`,
        [updatedOrder[0].discountId]
      );

      const result = {
        ...updatedOrder[0],
        orderItems,
        discount: discount[0] || null,
      };

      // ✅ Emit WebSocket ke semua client (gunakan global)
      const io = (global as any).io;
      if (io) {
        io.emit("paymentStatusUpdated", result);
      }

      return NextResponse.json({ success: true, order: result });
    } catch (error: any) {
      console.error("Error updating payment status:", error);
      return NextResponse.json({ message: "Gagal memperbarui status pembayaran", error: error.message }, { status: 500 });
    } finally {
      conn.release();
    }
  } catch (error: any) {
    console.error("Error updating payment status:", error);
    return NextResponse.json({ message: "Gagal memperbarui status pembayaran", error: error.message }, { status: 500 });
  }
}
