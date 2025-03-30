import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// PUT: Update discount
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; // 👈 ini kuncinya!
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

    const setClause = keys.map((key) => `${key} = ?`).join(", ");

    await db.execute(`UPDATE discount SET ${setClause} WHERE id = ?`, [...values, discountId]);

    const [rows]: any = await db.query(`SELECT * FROM discount WHERE id = ?`, [discountId]);

    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error("Error updating discount:", error);
    return NextResponse.json({ error: "Failed to update discount" }, { status: 500 });
  }
}

// DELETE: Soft delete discount
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; // 👈 juga pakai await
  const discountId = Number(id);

  if (!discountId) {
    return NextResponse.json({ error: "Missing discount id" }, { status: 400 });
  }

  try {
    await db.execute(`UPDATE discount SET isActive = false WHERE id = ?`, [discountId]);

    const [rows]: any = await db.query(`SELECT * FROM discount WHERE id = ?`, [discountId]);

    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error("Error deleting discount:", error);
    return NextResponse.json({ error: "Failed to delete discount" }, { status: 500 });
  }
}
