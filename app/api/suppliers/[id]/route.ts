import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// Ekstrak ID dari URL params
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params; // 👈 juga pakai await
    const supplierId = Number(id);
  if (!supplierId) {
    return NextResponse.json({ error: 'Invalid supplier ID' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const keys = Object.keys(body);
    const values = Object.values(body);

    if (keys.length === 0) {
      return NextResponse.json({ error: "No update data provided" }, { status: 400 });
    }

    const setClause = keys.map((key) => `${key} = ?`).join(", ");

    await db.execute(`UPDATE supplier SET ${setClause} WHERE id = ?`, [...values, supplierId]);

    const [updatedSupplier] = await db.execute('SELECT * FROM supplier WHERE id = ?', [supplierId]);
    return NextResponse.json((updatedSupplier as any)[0]);
  } catch (error) {
    console.error('Error updating supplier:', error);
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 });
  }
}

// DELETE: Hard delete supplier
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supplierId = Number(id);

  if (!supplierId) {
    return NextResponse.json({ error: 'Invalid supplier ID' }, { status: 400 });
  }

  try {
    // Hard delete
    await db.execute("DELETE FROM supplier WHERE id = ?", [supplierId]);

    return NextResponse.json({ message: "Supplier deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    return NextResponse.json({ error: "Failed to delete supplier" }, { status: 500 });
  }
}
