import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET: Ambil data pengguna
export async function GET(req: NextRequest) {
    try {
        const [rows] = await db.query('SELECT * FROM pengguna');
        return NextResponse.json(rows, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}

