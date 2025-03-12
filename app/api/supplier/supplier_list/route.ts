import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

// Koneksi Database
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "notarichcafe_pos",
});

export async function GET() {
  try {
    const [rows]: any = await db.execute("SELECT * FROM supplier");
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 });
  }
}
