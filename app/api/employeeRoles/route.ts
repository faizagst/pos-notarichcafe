import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";

export async function GET() {
  try {
    const [roles] = await db.query<RowDataPacket[]>("SELECT * FROM roleEmployee");
    return NextResponse.json(roles, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, appPermissions, backofficePermissions } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    const [result] = await db.query<ResultSetHeader>(
      "INSERT INTO roleEmployee (name, appPermissions, backofficePermissions) VALUES (?, ?, ?)",
      [name, JSON.stringify(appPermissions), JSON.stringify(backofficePermissions)]
    );

    return NextResponse.json({ id: result.insertId, name, appPermissions, backofficePermissions }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, name, appPermissions, backofficePermissions } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Role ID is required" }, { status: 400 });
    }

    await db.query(
      "UPDATE roleEmployee SET name = ?, appPermissions = ?, backofficePermissions = ? WHERE id = ?",
      [name, JSON.stringify(appPermissions), JSON.stringify(backofficePermissions), id]
    );

    return NextResponse.json({ id, name, appPermissions, backofficePermissions }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Role ID is required" }, { status: 400 });
    }

    await db.query("DELETE FROM roleEmployee WHERE id = ?", [id]);
    return NextResponse.json({ message: "Role deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
