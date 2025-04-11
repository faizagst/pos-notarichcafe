import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { ResultSetHeader } from "mysql2";

// ✅ Helper filter permission aktif saja
function filterTruthy(obj: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => Boolean(value))
  );
}

export async function GET() {
  try {
    const [rows] = await db.query<any[]>(`
      SELECT
        r.id AS role_id,
        r.name AS role_name,
        r.appPermissions,
        r.backofficePermissions,
        e.id AS employee_id,
        e.firstName AS employee_firstname,
        e.lastName AS employee_lastname,
        u.id AS user_id,
        u.username AS user_username
      FROM roleEmployee r
      LEFT JOIN employee e ON e.roleId = r.id
      LEFT JOIN user u ON u.roleId = r.id
    `);

    // Kelompokkan data berdasarkan role_id
    const roleMap = new Map<number, any>();
    for (const row of rows) {
      const roleId = row.role_id;
    
      if (!roleMap.has(roleId)) {
        roleMap.set(roleId, {
          id: roleId,
          name: row.role_name,
          appPermissions: filterTruthy(JSON.parse(row.appPermissions || "{}")),
          backofficePermissions: filterTruthy(JSON.parse(row.backofficePermissions || "{}")),
          employees: [],
          users: [],
        });
      }
    
      const role = roleMap.get(roleId);
    
      if (row.employee_id && !role.employees.find((e: any) => e.id === row.employee_id)) {
        role.employees.push({
          id: row.employee_id,
          name: `${row.employee_firstname ?? ""} ${row.employee_lastname ?? ""}`.trim(),
        });
      }
    
      if (row.user_id && !role.users.find((u: any) => u.id === row.user_id)) {
        role.users.push({ id: row.user_id, username: row.user_username });
      }
    }
    

    const roles = Array.from(roleMap.values());

    return NextResponse.json(roles, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, appPermissions, backofficePermissions } = body;

    if (!name) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    const result = await db.query(
      `INSERT INTO roleEmployee (name, appPermissions, backofficePermissions)
       VALUES (?, ?, ?);`,
      [name, JSON.stringify(appPermissions), JSON.stringify(backofficePermissions)]
    ) as unknown as [ResultSetHeader, any];

    const insertedId = result[0].insertId;

    const [newRole]: any = await db.query(`SELECT * FROM roleEmployee WHERE id = ?`, [insertedId]);
    return NextResponse.json(newRole[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}


export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, appPermissions, backofficePermissions } = body;

    if (!id) {
      return NextResponse.json({ error: "Role ID is required" }, { status: 400 });
    }

    await db.query(
      `UPDATE roleEmployee SET name = ?, appPermissions = ?, backofficePermissions = ? WHERE id = ?`,
      [name, JSON.stringify(appPermissions), JSON.stringify(backofficePermissions), id]
    );

    const [updatedRole]:any = await db.query(`SELECT * FROM roleEmployee WHERE id = ?`, [id]);
    return NextResponse.json(updatedRole[0], { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Role ID is required" }, { status: 400 });
    }

    await db.query(`DELETE FROM roleEmployee WHERE id = ?`, [id]);

    return NextResponse.json({ message: "Role deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
