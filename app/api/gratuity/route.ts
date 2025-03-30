import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// GET: Ambil semua gratuity
export async function GET() {
  try {
    const [gratuities]: any = await db.query("SELECT * FROM gratuity");
    return NextResponse.json(gratuities, { status: 200 });
  } catch (error) {
    console.error("Error fetching gratuities:", error);
    return NextResponse.json({ error: "Failed to fetch gratuities" }, { status: 500 });
  }
}

// POST: Tambah gratuity baru
export async function POST(req: NextRequest) {
  try {
    const { name, value, isActive } = await req.json();

    await db.execute(
      "INSERT INTO gratuity (name, value, isActive, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())",
      [name, Number(value), isActive !== undefined ? isActive : true]
    );

    const [result]: any = await db.query("SELECT * FROM gratuity ORDER BY id DESC LIMIT 1");

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating gratuity:", error);
    return NextResponse.json({ error: "Failed to create gratuity" }, { status: 500 });
  }
}
