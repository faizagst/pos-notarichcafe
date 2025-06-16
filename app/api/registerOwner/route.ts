import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import * as argon2 from 'argon2';

export async function POST(req: NextRequest) {
  console.log("===== /api/register-owner START =====");

  try {
    const body = await req.json();
    const { username, email, password, role, token, manualToken } = body;

    console.log("Parsed fields:", { username, email, password, role, token, manualToken });

    const finalToken = token || manualToken;

    // Validasi input minimal
    if (!username || !email || !password) {
      return NextResponse.json({ message: "Data tidak lengkap" }, { status: 400 });
    }

    if (role && role.toLowerCase() !== "owner") {
      return NextResponse.json({ message: "Role tidak valid untuk owner" }, { status: 400 });
    }

    // Cek duplikat username/email
    const [existing]: any = await db.query(
      `SELECT id FROM owner WHERE username = ? OR email = ? LIMIT 1`,
      [username, email]
    );

    if (existing.length > 0) {
      return NextResponse.json({ message: "Email atau username sudah digunakan" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await argon2.hash(password);

    // Simpan owner baru
    const [result]: any = await db.query(
      `INSERT INTO owner (username, email, password, token, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [username, email, hashedPassword, finalToken, 'owner']
    );

    const insertedId = result.insertId;

    // Ambil data owner yang baru disimpan
    const [newOwnerRows]: any = await db.query(
      `SELECT id, username, email, role FROM owner WHERE id = ?`,
      [insertedId]
    );

    const newOwner = newOwnerRows[0];

    return NextResponse.json({ message: "Registrasi owner berhasil", owner: newOwner }, { status: 201 });

  } catch (error: any) {
    console.error("Error during owner registration:", error);
    return NextResponse.json({ message: error.message || "Terjadi kesalahan, coba lagi nanti" }, { status: 500 });
  } finally {
    console.log("===== /api/register-owner END =====");
  }
}
