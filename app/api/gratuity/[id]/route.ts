import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";


// DELETE: Hard delete gratuity
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const gratuityId = Number(id);

  if (!gratuityId) {
    return NextResponse.json({ error: "Missing gratuity id" }, { status: 400 });
  }

  try {
    // Hard delete
    await db.execute("DELETE FROM gratuity WHERE id = ?", [gratuityId]);

    return NextResponse.json({ message: "Gratuity deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting gratuity:", error);
    return NextResponse.json({ error: "Failed to delete gratuity" }, { status: 500 });
  }
}


// PUT: Update gratuity
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
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

    // Jika user ingin mengubah nama, cek apakah nama sudah dipakai oleh gratuity lain
    if (body.name) {
      const [existingRows]: any = await db.query(
        'SELECT id FROM gratuity WHERE name = ? AND id != ?',
        [body.name, gratuityId]
      );
      if (existingRows.length > 0) {
        return NextResponse.json({ error: 'Gratuity name already exists' }, { status: 409 });
      }
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
