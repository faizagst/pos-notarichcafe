import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(_req: NextRequest) {
  try {
    const [rows] = await db.execute(
      `
      SELECT id, name, price, unit
      FROM ingredient
      WHERE type = 'RAW' AND isActive = true
      `
    );

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("Error fetching raw ingredients:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json({ message: "Method not allowed" }, { status: 405 });
}
