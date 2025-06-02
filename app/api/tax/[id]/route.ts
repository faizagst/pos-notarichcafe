import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// DELETE: Hard delete tax
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const taxId = Number(id);

  if (!taxId) {
    return NextResponse.json({ error: "Missing tax id" }, { status: 400 });
  }

  try {
    // Hard delete
    await db.execute("DELETE FROM tax WHERE id = ?", [taxId]);

    return NextResponse.json({ message: "Tax deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting tax:", error);
    return NextResponse.json({ error: "Failed to delete tax" }, { status: 500 });
  }
}


// PUT: Update tax
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params; // 👈 juga pakai await
    const taxId = Number(id);
  
    if (!taxId) {
      return NextResponse.json({ error: "Missing tax id" }, { status: 400 });
    }

  try {
    const body = await req.json();
    const keys = Object.keys(body);
    const values = Object.values(body);

    if (keys.length === 0) {
      return NextResponse.json({ error: "No update data provided" }, { status: 400 });
    }

     // Jika user ingin mengubah nama, cek apakah nama sudah dipakai oleh tax lain
     if (body.name) {
      const [existingRows]: any = await db.query(
        'SELECT id FROM tax WHERE name = ? AND id != ?',
        [body.name, taxId]
      );
      if (existingRows.length > 0) {
        return NextResponse.json({ error: 'Tax name already exists' }, { status: 409 });
      }
    }

    const setClause = keys.map((key) => `${key} = ?`).join(", ");

    await db.execute(`UPDATE tax SET ${setClause} WHERE id = ?`, [...values, taxId]);

    const [updated]: any = await db.query("SELECT * FROM tax WHERE id = ?", [taxId]);
    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error("Error updating tax:", error);
    return NextResponse.json({ error: "Failed to update tax" }, { status: 500 });
  }
}
