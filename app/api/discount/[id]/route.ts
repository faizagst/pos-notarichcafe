import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// PUT: Update discount
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const discountId = Number(id);

  if (!discountId) {
    return NextResponse.json({ error: "Missing discount id" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const keys = Object.keys(body);
    const values = Object.values(body);

    if (keys.length === 0) {
      return NextResponse.json({ error: "No update data provided" }, { status: 400 });
    }

    // Pastikan nama tetap unik per scope, kecuali ini diskon yang sama
    if (body.name && body.scope) {
      const [existing] = await db.query(
        'SELECT id FROM discount WHERE name = ? AND scope = ? AND id != ?',
        [body.name, body.scope, discountId]
      );

      if ((existing as any[]).length > 0) {
        return NextResponse.json({ error: 'Discount name already exists in this scope' }, { status: 400 });
      }
    }

    const setClause = keys.map((key) => `${key} = ?`).join(", ");

    await db.execute(`UPDATE discount SET ${setClause} WHERE id = ?`, [...values, discountId]);

    const [rows]: any = await db.query(`SELECT * FROM discount WHERE id = ?`, [discountId]);

    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error("Error updating discount:", error);
    return NextResponse.json({ error: "Failed to update discount" }, { status: 500 });
  }
}

// DELETE: Hard delete discount
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const discountId = Number(id);

  if (!discountId) {
    return NextResponse.json({ error: "Missing discount id" }, { status: 400 });
  }

  try {
    // Hapus relasi jika ada (contoh: menuDiscount)
    await db.query(`DELETE FROM menuDiscount WHERE discountId = ?`, [discountId]);

    // Hapus dari tabel utama discount
    await db.execute(`DELETE FROM discount WHERE id = ?`, [discountId]);

    return NextResponse.json({
      message: "Discount deleted permanently",
      discountId,
    }, { status: 200 });
  } catch (error) {
    console.error("Error deleting discount:", error);
    return NextResponse.json({ error: "Failed to delete discount" }, { status: 500 });
  }
}

