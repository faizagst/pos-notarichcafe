// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import * as argon2 from 'argon2';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ message: 'Username and password must be strings.' }, { status: 400 });
    }

    // Helper function to set cookie and response
    const createLoginResponse = (role: string, token: string, userInfo: object) => {
      const response = NextResponse.json({ message: 'Login successful', user: userInfo });
      response.cookies.set(role.toLowerCase(), encodeURIComponent(token), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24, // 1 day
      });
      return response;
    };

    // === Try user table ===
    const [userRows]: any = await db.query(`
      SELECT u.id, u.username, u.email, u.password, u.token, r.name as role
      FROM user u
      LEFT JOIN roleEmployee r ON u.roleId = r.id
      WHERE u.username = ?
      LIMIT 1
    `, [username]);

    if (userRows?.length > 0) {
      const user = userRows[0];

      const isPasswordValid = await argon2.verify(user.password, password);
      if (!isPasswordValid) return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
      if (!user.token || !user.role) return NextResponse.json({ message: 'Invalid user data' }, { status: 500 });

      return createLoginResponse(user.role, user.token, {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      });
    }

    // === Try owner table ===
    const [ownerRows]: any = await db.query(`
      SELECT id, username, email, password, token, role
      FROM owner
      WHERE username = ?
      LIMIT 1
    `, [username]);

    if (ownerRows?.length > 0) {
      const owner = ownerRows[0];

      const isPasswordValid = await argon2.verify(owner.password, password);
      if (!isPasswordValid) return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
      if (!owner.token || !owner.role) return NextResponse.json({ message: 'Invalid owner data' }, { status: 500 });

      return createLoginResponse('owner', owner.token, {
        id: owner.id,
        username: owner.username,
        email: owner.email,
        role: owner.role,
      });
    }

    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'An error occurred during login.' }, { status: 500 });
  }
}
