import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import * as argon2 from "argon2";

export async function POST(req: NextRequest) {
  console.log("===== /api/register (Invite Only + employeeId) START =====");

  try {
    const { username, password, token } = await req.json();

    if (!username || !password || !token) {
      return NextResponse.json({ message: "Data tidak lengkap atau token tidak tersedia" }, { status: 400 });
    }

    // Ambil data employee berdasarkan token
    const [rows]: any = await db.query(
      `SELECT e.*, r.name AS roleName FROM employee e 
       LEFT JOIN roleEmployee r ON e.roleId = r.id 
       WHERE e.inviteToken = ?`,
      [token]
    );

    const employee = rows[0];
    if (!employee) {
      return NextResponse.json({ message: "Token tidak valid" }, { status: 400 });
    }

    if (employee.inviteExpiresAt && new Date(employee.inviteExpiresAt) < new Date()) {
      return NextResponse.json({ message: "Token sudah expired" }, { status: 400 });
    }

    // Cek jika email atau username sudah digunakan
    const [existing]: any = await db.query(
      `SELECT * FROM user WHERE email = ? OR username = ?`,
      [employee.email, username]
    );

    if (existing.length > 0) {
      return NextResponse.json({ message: "Email atau username sudah digunakan" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await argon2.hash(password);

    // Simpan user baru, termasuk employeeId
    const [result]: any = await db.query(
      `INSERT INTO user (username, email, password, roleId, token, employeeId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        username,
        employee.email,
        hashedPassword,
        employee.roleId,
        token,
        employee.id,
      ]
    );

    console.log("User created with ID:", result.insertId);

    return NextResponse.json({
      message: "Registrasi berhasil",
      user: {
        id: result.insertId,
        username,
        email: employee.email,
        roleId: employee.roleId,
        employeeId: employee.id,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error("Error during registration:", error);
    return NextResponse.json({ message: "Terjadi kesalahan saat registrasi" }, { status: 500 });
  } finally {
    console.log("===== /api/register END =====");
  }
}
