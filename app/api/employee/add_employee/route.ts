import { NextResponse, NextRequest } from 'next/server';
import db from '@/lib/db';


export async function POST(req: NextRequest) {
    try {
        const { employee_name, username, password, role } = await req.json();

        // Validasi input
        if (!employee_name || !username || !password || !role) {
            return NextResponse.json({
                error: 'All fields are required',
                details: 'Ensure all fields (employee_name, username, password, role) are filled in.'
            }, { status: 400 });
        }

        // Simpan ke database dengan parameterized query
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
