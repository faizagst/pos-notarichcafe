// app/api/auth/changePassword/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import * as argon2 from 'argon2';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = req.cookies;

    const token =
      decodeURIComponent(cookieStore.get('owner')?.value || '') ||
      decodeURIComponent(cookieStore.get('employee')?.value || '');

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized, token not found' }, { status: 401 });
    }

    const { oldPassword, newPassword } = await req.json();
    if (!oldPassword || !newPassword) {
      return NextResponse.json({ message: 'Data tidak lengkap' }, { status: 400 });
    }

    // Coba cari user berdasarkan token di tabel `user`
    const [userRows]: any = await db.query(
      `SELECT id, password FROM user WHERE token = ? LIMIT 1`,
      [token]
    );

    // Kalau tidak ada di `user`, coba di `owner`
    const [ownerRows]: any =
      userRows.length === 0
        ? await db.query(`SELECT id, password FROM owner WHERE token = ? LIMIT 1`, [token])
        : [];

    const account = userRows[0] || ownerRows[0];
    const table = userRows[0] ? 'user' : ownerRows[0] ? 'owner' : null;

    if (!account || !table) {
      return NextResponse.json({ message: 'User tidak ditemukan' }, { status: 404 });
    }

    const isPasswordCorrect = await argon2.verify(account.password, oldPassword);
    if (!isPasswordCorrect) {
      return NextResponse.json({ message: 'Password lama salah' }, { status: 401 });
    }

    const hashedNewPassword = await argon2.hash(newPassword);
    await db.query(
      `UPDATE ${table} SET password = ?, updatedAt = NOW() WHERE id = ?`,
      [hashedNewPassword, account.id]
    );

    return NextResponse.json({ message: 'Password berhasil diubah' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
