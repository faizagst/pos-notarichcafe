import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db"; // Koneksi mysql2

export async function POST(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json({ message: "Method not allowed" }, { status: 405 });
  }

  try {
    const { orderId, paymentMethod, paymentStatus, paymentId, status } = await req.json();

    if (!orderId || !paymentMethod || !paymentStatus) {
      return NextResponse.json({ message: "Order ID, payment method, dan status wajib diisi" }, { status: 400 });
    }

    const conn = await db.getConnection();
    try {
      const [updatedOrderRows] = await conn.query(
        `UPDATE \`order\` 
        SET paymentMethod = ?, paymentStatus = ?, paymentId = ?, status = ? 
        WHERE id = ?`,
        [paymentMethod, paymentStatus, paymentId, status || "pending", orderId]
      );

      if (updatedOrderRows.affectedRows === 0) {
        return NextResponse.json({ message: "Order not found" }, { status: 404 });
      }

      const [updatedOrder] = await conn.query(
        `SELECT * FROM \`order\` WHERE id = ?`,
        [orderId]
      );

      const [orderItems] = await conn.query(
        `SELECT oi.*, m.*, GROUP_CONCAT(DISTINCT mod.name) AS modifiers 
         FROM order_item oi
         LEFT JOIN menu m ON oi.menuId = m.id
         LEFT JOIN order_item_modifier oim ON oi.id = oim.orderItemId
         LEFT JOIN modifier mod ON oim.modifierId = mod.id
         WHERE oi.orderId = ?
         GROUP BY oi.id`,
        [orderId]
      );

      const [discount] = await conn.query(
        `SELECT * FROM discount WHERE id = ?`,
        [updatedOrder[0].discountId]
      );

      const result = {
        ...updatedOrder[0],
        orderItems,
        discount: discount[0] || null,
      };

      // Emit event WebSocket
      if (req.socket && (req.socket as any).server) {
        const io = (req.socket as any).server.io;
        if (io) {
          io.emit("paymentStatusUpdated", result);
          console.log("Status pembayaran dikirim ke kasir melalui WebSocket:", result);
        } else {
          console.error("WebSocket server belum diinisialisasi");
        }
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
