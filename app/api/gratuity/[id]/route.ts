import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// DELETE: Soft delete gratuity
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params; // 👈 juga pakai await
    const gratuityId = Number(id);
  if (!gratuityId) {
    return NextResponse.json({ error: "Missing gratuity id" }, { status: 400 });
  }

  try {
    await db.execute("UPDATE gratuity SET isActive = false WHERE id = ?", [gratuityId]);
    const [updated]: any = await db.query("SELECT * FROM gratuity WHERE id = ?", [gratuityId]);
    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error("Error deleting gratuity:", error);
    return NextResponse.json({ error: "Failed to delete gratuity" }, { status: 500 });
  }
}

// PUT: Update gratuity
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params; // 👈 ini kuncinya!
    const gratuityId = Number(id);
  if (!gratuityId) {
    return NextResponse.json({ error: "Missing gratuity id" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const keys = Object.keys(body);
    const values = Object.values(body);

    if (keys.length === 0) {
      return NextResponse.json({ error: "No update data provided" }, { status: 400 });
    }

    const setClause = keys.map((key) => `${key} = ?`).join(", ");

    await db.execute(`UPDATE gratuity SET ${setClause} WHERE id = ?`, [...values, gratuityId]);

    const [updated]: any = await db.query("SELECT * FROM gratuity WHERE id = ?", [gratuityId]);
    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error("Error updating gratuity:", error);
    return NextResponse.json({ error: "Failed to update gratuity" }, { status: 500 });
  }
}
