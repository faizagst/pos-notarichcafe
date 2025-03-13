import { NextResponse } from "next/server";
import db from '@/lib/db';

export async function PUT(req: Request) {
    try {
      const { id_supplier, nama, kontak, alamat } = await req.json();
  
      if (!id_supplier || !nama || !kontak || !alamat) {
        return NextResponse.json({ error: "Semua kolom harus diisi!" }, { status: 400 });
      }
  
      if (!/^\d{10,15}$/.test(kontak)) {
        return NextResponse.json({ error: "No Handphone harus angka dan minimal 10 digit!" }, { status: 400 });
      }
  
      const [result]: any = await db.execute(
        "UPDATE supplier SET nama = ?, kontak = ?, alamat = ? WHERE id_supplier = ?",
        [nama, kontak, alamat, id_supplier]
      );
  
      return NextResponse.json({ message: "Supplier berhasil diperbarui!" }, { status: 200 });
  
    } catch (error: any) {
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 });
    }
  }