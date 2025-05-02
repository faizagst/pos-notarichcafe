import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { hash } from "argon2";

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json();

    // Validasi password: minimal 8 karakter, ada huruf dan angka
    const isValidPassword = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(newPassword);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Password minimal 8 karakter dan mengandung huruf serta angka." },
        { status: 400 }
      );
    }

    const [rows]: any = await db.query(
      "SELECT * FROM user WHERE resetToken = ? AND resetTokenExpires > NOW()",
      [token]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Token tidak valid atau sudah kadaluarsa" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(newPassword);

    await db.query(
      "UPDATE user SET password = ?, resetToken = NULL, resetTokenExpires = NULL WHERE id = ?",
      [hashedPassword, rows[0].id]
    );

    return NextResponse.json({ message: "Password berhasil direset" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal reset password" }, { status: 500 });
  }
}
