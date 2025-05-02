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

    if (!firstName || !lastName || !email || !phone || !roleId || !expiredDate) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // Cek email duplikat
    const [emailCheck] = await db.query("SELECT id FROM employee WHERE email = ?", [email]);
    if ((emailCheck as any[]).length > 0) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    // Cek phone duplikat
    const [phoneCheck] = await db.query("SELECT id FROM employee WHERE phone = ?", [phone]);
    if ((phoneCheck as any[]).length > 0) {
      return NextResponse.json({ error: "Phone number already exists" }, { status: 409 });
    }

    const inviteToken = crypto.randomBytes(16).toString("hex");
    const inviteExpiresAt = new Date();
    inviteExpiresAt.setMinutes(inviteExpiresAt.getMinutes() + 15);

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
        text: `Halo ${firstName} ${lastName}, selamat datang di keluarga Notarich Cafe. Silakan registrasi akunmu melalui link berikut (berlaku 15 menit): ${registerLink}. Terima Kasih!`,
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

    if (!id || !firstName || !lastName || !email || !phone || !roleId || !expiredDate) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // Cek email duplikat kecuali milik dirinya sendiri
    const [emailCheck] = await db.query("SELECT id FROM employee WHERE email = ? AND id != ?", [email, id]);
    if ((emailCheck as any[]).length > 0) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    // Cek phone duplikat kecuali milik dirinya sendiri
    const [phoneCheck] = await db.query("SELECT id FROM employee WHERE phone = ? AND id != ?", [phone, id]);
    if ((phoneCheck as any[]).length > 0) {
      return NextResponse.json({ error: "Phone number already exists" }, { status: 409 });
    }
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
    if (!id) {
      return NextResponse.json({ error: "Employee ID required" }, { status: 400 });
    }

    // Hapus user yang terkait
    await db.query("DELETE FROM user WHERE employeeId = ?", [id]);
    // Hapus employee
    await db.query("DELETE FROM employee WHERE id = ?", [id]);

    return NextResponse.json({ message: "Employee and associated user deleted" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 });
  }
}
