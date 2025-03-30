import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(_req: NextRequest) {
  try {
    const [gudangs] = await db.execute(
      'SELECT * FROM gudang WHERE isActive = true'
    );
    return NextResponse.json(gudangs);
  } catch (error) {
    console.error("Error fetching gudangs:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export function POST() {
  return NextResponse.json({ message: "Method not allowed" }, { status: 405 });
}
