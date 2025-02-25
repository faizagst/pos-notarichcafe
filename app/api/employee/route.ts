import { NextResponse, NextRequest } from 'next/server';
import { RowDataPacket } from 'mysql2/promise';
import db from '@/lib/db';

// GET: Ambil Data Karyawan
export async function GET() {
    try {
        const [rows] = await db.query('SELECT id_pengguna, nama AS employee_name, username, role FROM pengguna');
        const employees = (rows as RowDataPacket[]).map((row) => ({
            id: row.id_pengguna,
            employee_name: row.employee_name,
            username: row.username,
            role: row.role
        }));
        return NextResponse.json(employees);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}

// POST: Tambah Data Karyawan
export async function POST(req: NextRequest) {
    try {
        const { employee_name, username, password, role } = await req.json();

        if (!employee_name || !username || !password || !role) {
            return NextResponse.json({
                error: 'All fields are required',
                details: 'Ensure all fields are filled in.'
            }, { status: 400 });
        }

        const [result]: any = await db.execute(
            'INSERT INTO pengguna (nama, username, password, role) VALUES (?, ?, ?, ?)',
            [employee_name, username, password, role]
        );

        if (result?.affectedRows === 0) {
            return NextResponse.json({ error: 'Failed to add employee' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Employee added successfully' }, { status: 201 });
    } catch (error: any) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
    }
}

// PUT: Update Data Karyawan
export async function PUT(req: NextRequest) {
    try {
        const { id, employee_name, username, role } = await req.json();

        if (!id || !employee_name || !username || !role) {
            return NextResponse.json({
                error: 'All fields are required',
                details: 'Ensure all fields are filled in.'
            }, { status: 400 });
        }

        const [result]: any = await db.execute(
            'UPDATE pengguna SET nama = ?, username = ?, role = ? WHERE id_pengguna = ?',
            [employee_name, username, role, id]
        );

        if (result?.affectedRows === 0) {
            return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Employee updated successfully' });
    } catch (error: any) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
    }
}

// DELETE: Hapus Data Karyawan
export async function DELETE(req: NextRequest) {
    try {
        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const [result]: any = await db.execute(
            'DELETE FROM pengguna WHERE id_pengguna = ?',
            [id]
        );

        if (result?.affectedRows === 0) {
            return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Employee deleted successfully' });
    } catch (error: any) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
    }
}
