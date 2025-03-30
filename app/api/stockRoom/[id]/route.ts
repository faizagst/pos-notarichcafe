import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// Helper untuk ambil ID dari param
function extractIdFromParams(req: NextRequest): number | null {
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop();
  if (!id || isNaN(Number(id))) return null;
  return Number(id);
}

export async function PUT(req: NextRequest) {
  const id = extractIdFromParams(req);
  if (!id) {
    return NextResponse.json({ message: "ID tidak valid." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const {
      ingredientId,
      name,
      start,
      stockIn,
      used,
      wasted,
      stockMin,
      unit,
      isArchive,
    } = body;

    const numStart = Number(start);
    const numStockIn = Number(stockIn);
    const numUsed = Number(used);
    const numWasted = Number(wasted);
    const numStockMin = Number(stockMin);
    const stock = numStart + numStockIn - numUsed - numWasted;

    await db.execute(
      `UPDATE gudang SET 
        ingredientId = ?, name = ?, start = ?, stockIn = ?, used = ?, wasted = ?, stockMin = ?, 
        stock = ?, unit = ?, isActive = ?
      WHERE id = ?`,
      [
        ingredientId,
        name,
        numStart,
        numStockIn,
        numUsed,
        numWasted,
        numStockMin,
        stock,
        unit,
        !isArchive, // karena isArchive === true berarti isActive === false
        id,
      ]
    );

    const [updated] = await db.execute('SELECT * FROM gudang WHERE id = ?', [id]);
    return NextResponse.json({
      message: "Data gudang berhasil diperbarui.",
      gudang: Array.isArray(updated) ? updated[0] : updated,
    });
  } catch (error: any) {
    console.error("Error updating gudang:", error);
    return NextResponse.json(
      {
        message: "Terjadi kesalahan saat mengupdate data gudang.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const id = extractIdFromParams(req);
  if (!id) {
    return NextResponse.json({ message: "ID tidak valid." }, { status: 400 });
  }

  try {
    const [rows] = await db.execute('SELECT ingredientId FROM gudang WHERE id = ?', [id]);
    const gudang:any = Array.isArray(rows) ? rows[0] : null;

    if (!gudang) {
      return NextResponse.json({ message: "Data gudang tidak ditemukan." }, { status: 404 });
    }

    await db.execute('UPDATE gudang SET isActive = false WHERE id = ?', [id]);
    await db.execute('UPDATE ingredient SET isActive = false WHERE id = ?', [gudang.ingredientId]);

    return NextResponse.json({
      message: "Data gudang berhasil dihapus (soft delete).",
      toast: {
        type: "success",
        color: "green",
        text: "Ingredient berhasil dihapus!",
      },
    });
  } catch (error: any) {
    console.error("Error deleting gudang:", error);
    return NextResponse.json(
      {
        message: "Terjadi kesalahan saat menghapus data gudang.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
