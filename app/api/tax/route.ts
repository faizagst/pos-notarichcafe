import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// GET: Ambil semua tax
export async function GET() {
  try {
    const [rows] = await db.query("SELECT * FROM tax");
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("Error fetching taxes:", error);
    return NextResponse.json({ error: "Failed to fetch taxes" }, { status: 500 });
  }
}

// POST: Tambah tax baru
export async function POST(req: NextRequest) {
  try {
    const { name, value, isActive } = await req.json();

    if (!name || value === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [result]: any = await db.execute(
      "INSERT INTO tax (name, value, isActive , createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())",
      [name, Number(value), isActive !== undefined ? isActive : true]
    );

    const insertedId = result.insertId;

    const [newTax]: any = await db.query("SELECT * FROM tax WHERE id = ?", [insertedId]);

    return NextResponse.json(newTax[0], { status: 201 });
  } catch (error) {
    console.error("Error creating tax:", error);
    return NextResponse.json({ error: "Failed to create tax" }, { status: 500 });
  }
}
