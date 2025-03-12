import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

// Koneksi Database
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "notarichcafe_pos",
});

export async function DELETE(req: Request) {
  try {
    const { id_supplier } = await req.json();

    if (!id_supplier) {
      return NextResponse.json({ error: "ID Supplier harus diisi" }, { status: 400 });
    }

    const [result]: any = await db.execute(
      "DELETE FROM supplier WHERE id_supplier = ?",
      [id_supplier]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Gagal menghapus supplier" }, { status: 500 });
    }

    return NextResponse.json({ message: "Supplier berhasil dihapus" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 });
  }
}
