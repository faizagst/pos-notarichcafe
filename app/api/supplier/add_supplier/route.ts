import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import db from '@/lib/db';

export async function POST(req: Request) {
  try {
    const bodyText = await req.text(); // Baca body sebagai teks
    console.log("Raw request body:", bodyText);

    // Cek apakah body berupa JSON
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (err) {
      return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
    }

    const { nama, kontak, alamat } = data;

    if (!nama || !kontak || !alamat) {
      return NextResponse.json({ error: "Semua kolom harus diisi!" }, { status: 400 });
    }

    if (!/^\d{10,15}$/.test(kontak)) {
      return NextResponse.json({ error: "No Handphone harus angka dan minimal 10 digit!" }, { status: 400 });
    }

    const [result]: any = await db.execute(
      "INSERT INTO supplier (nama, kontak, alamat) VALUES (?, ?, ?)",
      [nama, kontak, alamat]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Gagal menambahkan supplier!" }, { status: 500 });
    }

    return NextResponse.json({ message: "Supplier berhasil ditambahkan!" }, { status: 201 });

  } catch (error: any) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 });
  }
}

