import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, ingredientId, quantity, totalPrice } = body;

    // Jika ada "date", fetch data berdasarkan tanggal
    if (date) {
      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(selectedDate);
      nextDate.setDate(nextDate.getDate() + 1);

      const [rows]: any = await db.execute(
        `
        SELECT po.id, po.quantity, po.totalPrice, po.createdAt, 
               i.name AS ingredientName, i.unit
        FROM purchaseOrder po
        JOIN ingredient i ON po.ingredientId = i.id
        WHERE po.createdAt >= ? AND po.createdAt < ?
        `,
        [selectedDate, nextDate]
      );

      // Format agar sesuai frontend
      const formatted = rows.map((po: any) => ({
        id: po.id,
        quantity: po.quantity,
        totalPrice: po.totalPrice,
        createdAt: po.createdAt,
        ingredient: {
          name: po.ingredientName,
          unit: po.unit,
        },
      }));
      return NextResponse.json(formatted);
    }

    // Jika data lengkap untuk membuat purchase order
    if (ingredientId && quantity && totalPrice) {
      // Insert purchase order baru
      const [result]: any = await db.execute(
        `
        INSERT INTO purchaseOrder (ingredientId, quantity, totalPrice, updatedAt)
        VALUES (?, ?, ?, NOW ())
        `,
        [ingredientId, quantity, totalPrice]
      );

      const purchaseOrderId = result.insertId;

      // Ambil data gudang berdasarkan ingredientId
      const [gudangRows]: any = await db.execute(
        `SELECT * FROM gudang WHERE ingredientId = ? LIMIT 1`,
        [ingredientId]
      );

      if (gudangRows.length > 0) {
        const gudang = gudangRows[0];

        const newStockIn = gudang.stockIn + quantity;
        const newStock =
          gudang.start + newStockIn - gudang.used - gudang.wasted;

        // Update gudang stock
        await db.execute(
          `
          UPDATE gudang 
          SET stockIn = ?, stock = ?
          WHERE ingredientId = ?
          `,
          [newStockIn, newStock, ingredientId]
        );
      } else {
        console.warn(`Gudang record not found for ingredientId: ${ingredientId}`);
      }

      const newPrice = totalPrice / quantity;

      // Update harga di tabel Ingredient
      await db.execute(
        `UPDATE ingredient SET price = ? WHERE id = ?`,
        [newPrice, ingredientId]
      );

      return NextResponse.json({
        id: purchaseOrderId,
        ingredientId,
        quantity,
        totalPrice,
      }, { status: 201 });
    }

    return NextResponse.json(
      { message: "Missing required fields" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error handling purchase order:", error);
    return NextResponse.json(
      { message: "Error handling purchase order", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}
