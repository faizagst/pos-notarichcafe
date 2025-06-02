// app/api/verify-invite/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token not provided" }, { status: 400 });
    }

    // Cari employee berdasarkan token, sertakan relasi role (LEFT JOIN ke roleEmployee)
    const [rows]: any = await db.query(
      `SELECT e.*, r.name AS roleName
       FROM employee e
       LEFT JOIN roleEmployee r ON e.roleId = r.id
       WHERE e.inviteToken = ?
       LIMIT 1`,
      [token]
    );

    const employee = rows[0];

    if (!employee) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    // Cek apakah token sudah expired
    const now = new Date();
    const inviteExpiresAt = employee.inviteExpiresAt ? new Date(employee.inviteExpiresAt) : null;

    if (inviteExpiresAt && now > inviteExpiresAt) {
      return NextResponse.json({ error: "Token expired" }, { status: 410 });
    }

    return NextResponse.json({
      message: "Token valid",
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        roleId: employee.roleId,
        roleName: employee.roleName,
        inviteExpiresAt: employee.inviteExpiresAt,
      },
    });
  } catch (error) {
    console.error("Error verifying invite token:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
