import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const [suppliers] = await db.execute('SELECT * FROM supplier');
    return NextResponse.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, address, phone, email, isActive } = body;

    const [result] = await db.execute(
      `
      INSERT INTO supplier (name, address, phone, email, isActive)
      VALUES (?, ?, ?, ?, ?)
      `,
      [name, address, phone, email, isActive !== undefined ? isActive : 1]
    );

    const insertId = (result as any).insertId;

    const [newSupplier] = await db.execute('SELECT * FROM supplier WHERE id = ?', [insertId]);
    return NextResponse.json((newSupplier as any)[0], { status: 201 });
  } catch (error) {
    console.error('Error creating supplier:', error);
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 });
  }
}
