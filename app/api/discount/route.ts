import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET: Ambil semua diskon
export async function GET() {
  try {
    const [discounts] = await db.query('SELECT * FROM discount');
    return NextResponse.json(discounts);
  } catch (error) {
    console.error('Error fetching discounts:', error);
    return NextResponse.json({ error: 'Failed to fetch discounts' }, { status: 500 });
  }
}

// POST: Buat diskon baru
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, type, scope, value, isActive = true } = body;

    if (!name || !type || !scope || value === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [result]: any = await db.execute(
      `
      INSERT INTO discount (name, type, scope, value, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW());
    `,
      [name, type, scope, value, isActive]
    );

    const insertedId = result.insertId;

    // Ambil diskon yang baru dibuat
    const [newDiscountRows] = await db.query('SELECT * FROM discount WHERE id = ?', [insertedId]);
    const newDiscount = (newDiscountRows as any[])[0];

    return NextResponse.json(newDiscount, { status: 201 });
  } catch (error) {
    console.error('Error creating discount:', error);
    return NextResponse.json({ error: 'Failed to create discount' }, { status: 500 });
  }
}
