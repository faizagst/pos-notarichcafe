import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import argon2 from "argon2";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ message: "Username and password are required." }, { status: 400 });
  }

  try {
    const [rows]: any = await db.execute("SELECT * FROM pengguna WHERE username = ?", [username]);
    
    if (rows.length === 0) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const user = rows[0];

    // Cek apakah password sudah di-hash dengan Argon2
    if (!user.password.startsWith("$argon2")) {
      // Jika belum di-hash, gunakan perbandingan biasa dulu
      if (user.password !== password) {
        return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
      }

      // Hash password setelah login berhasil
      const hashedPassword = await argon2.hash(password);
      await db.execute("UPDATE pengguna SET password = ? WHERE id_pengguna = ?", [hashedPassword, user.id_pengguna]);

      console.log(`Password untuk ${username} telah di-hash dan diperbarui.`);
    } else {
      // Jika password sudah di-hash, gunakan Argon2 untuk verifikasi
      const isPasswordValid = await argon2.verify(user.password, password);
      if (!isPasswordValid) {
        return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
      }
    }

    // Login sukses, set cookie atau return data user
    const response = NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id_pengguna,
        username: user.username,
        role: user.role,
      },
    });
    response.cookies.set("user", user.id_pengguna, { path: "/", httpOnly: true, secure: true, sameSite: "strict" });
    
    return response;
  } catch (error) {
    console.error("Error logging in:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}