import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { hash } from "argon2";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Cek apakah email terdaftar
    const [rows]: any = await db.query("SELECT * FROM user WHERE email = ?", [email]);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Email tidak ditemukan" }, { status: 404 });
    }

    const token = crypto.randomBytes(20).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 menit

    // Simpan token dan expired di DB
    await db.query("UPDATE user SET resetToken = ?, resetTokenExpires = ? WHERE email = ?", [
      token,
      expiresAt,
      email,
    ]);

    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/resetPassword?token=${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reset Password - Notarich Café",
      text: `Klik link berikut untuk reset password kamu (berlaku 15 menit): ${resetLink}`,
    });

    return NextResponse.json({ message: "Link reset password telah dikirim ke email" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengirim reset password" }, { status: 500 });
  }
}
