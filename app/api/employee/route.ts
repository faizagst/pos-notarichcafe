import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import nodemailer from "nodemailer";
import crypto from "crypto";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function GET() {
  try {
    const [employees] = await db.query(
      "SELECT e.*, r.name AS roleName FROM employee e LEFT JOIN roleEmployee r ON e.roleId = r.id"
    );
    return NextResponse.json(employees, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error fetching employees" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, phone, roleId, expiredDate } = await req.json();
    const inviteToken = crypto.randomBytes(16).toString("hex");
    const inviteExpiresAt = new Date();
    inviteExpiresAt.setHours(inviteExpiresAt.getMinutes() + 24);

    const [result]: any = await db.query(
      "INSERT INTO employee (firstName, lastName, email, phone, roleId, expiredDate, inviteToken, inviteExpiresAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
      [firstName, lastName, email, phone, roleId, new Date(expiredDate), inviteToken, inviteExpiresAt]
    );

    if (email) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const registerLink = `${baseUrl}/register?token=${inviteToken}`;
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Selamat Datang di Notarich Cafe",
        text: `Halo ${firstName} ${lastName}, selamat datang di keluarga Notarich Cafe. Silakan registrasi akunmu melalui link berikut (berlaku 5 menit): ${registerLink}. Terima Kasih!`,
      });
    }

    return NextResponse.json({ id: result.insertId, firstName, lastName, email, phone, roleId, expiredDate }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error creating employee" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, firstName, lastName, email, phone, roleId, expiredDate } = await req.json();

    // Update employee data
    await db.query(
      "UPDATE employee SET firstName = ?, lastName = ?, email = ?, phone = ?, roleId = ?, expiredDate = ?, updatedAt = NOW() WHERE id = ?",
      [firstName, lastName, email, phone, roleId, new Date(expiredDate), id]
    );

    // Update related user role
    await db.query(
      "UPDATE user SET roleId = ? WHERE employeeId = ?",
      [roleId, id]
    );

    return NextResponse.json({ id, firstName, lastName, email, phone, roleId, expiredDate }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error updating employee" }, { status: 500 });
  }
}


export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await db.query("DELETE FROM employee WHERE id = ?", [id]);
    return NextResponse.json({ message: "Employee deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error deleting employee" }, { status: 500 });
  }
}
