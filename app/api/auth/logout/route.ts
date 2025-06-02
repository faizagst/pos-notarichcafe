// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Ambil semua cookies
    const allCookies = req.cookies.getAll();

    if (allCookies.length === 0) {
      return NextResponse.json({ message: 'No active session found.' }, { status: 400 });
    }

    const response = NextResponse.json({ message: 'Logout successful' });

    // Hapus semua cookies yang ditemukan (yang kemungkinan besar adalah role-token cookies)
    allCookies.forEach(cookie => {
      response.cookies.set(cookie.name, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        expires: new Date(0), // Buat cookie kadaluwarsa
      });
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ message: 'An error occurred during logout.' }, { status: 500 });
  }
}
