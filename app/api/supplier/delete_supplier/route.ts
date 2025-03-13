import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import db from '@/lib/db';

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id_supplier = searchParams.get("id_supplier");

    console.log("ID Supplier diterima di API:", id_supplier);

    if (!id_supplier) {
      console.error("Error: ID supplier tidak ditemukan di query parameter!");
      return NextResponse.json(
        { success: false, message: "ID supplier tidak ditemukan!" },
        { status: 400 }
      );
    }

    // Konversi ke integer untuk validasi
    const supplierIdInt = parseInt(id_supplier, 10);
    if (isNaN(supplierIdInt)) {
      console.error("Error: ID supplier bukan angka!");
      return NextResponse.json(
        { success: false, message: "ID supplier tidak valid!" },
        { status: 400 }
      );
    }

    console.log("Menjalankan query update untuk supplier ID:", supplierIdInt);

    // Query untuk soft delete
    const [result]: any = await db.execute(
      "UPDATE supplier SET is_deleted = 1 WHERE id_supplier = ?",
      [supplierIdInt]
    );

    console.log("Hasil query:", result);

    if (result.affectedRows > 0) {
      console.log("Supplier berhasil dinonaktifkan.");
      return NextResponse.json({ success: true, message: "Supplier berhasil di-nonaktifkan!" });
    } else {
      console.error("Error: Supplier tidak ditemukan atau sudah dihapus!");
      return NextResponse.json(
        { success: false, message: "Supplier tidak ditemukan atau sudah dihapus!" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error saat menonaktifkan supplier:", (error as Error).message);
    return NextResponse.json(
      { success: false, message: "Gagal menonaktifkan supplier!" },
      { status: 500 }
    );
  }
}