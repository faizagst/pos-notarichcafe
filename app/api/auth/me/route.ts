import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { backofficePermissionTree } from '@/lib/backofficePermissionTree';
import { appPermissionTree } from '@/lib/appPermissionTree';

function generateFullAppPermissionsFromTree() {
  const permissions: Record<string, boolean> = {};

  appPermissionTree.forEach(item => {
    permissions[item.key] = true;
  });

  return permissions;
}

function generateFullBackofficePermissions() {
  const permissions: Record<string, any> = {};

  backofficePermissionTree.forEach(item => {
    if (item.type === 'single') {
      permissions[item.parentKey] = true;
    } else if (item.type === 'group' && item.children && item.childrenKey) {
      permissions[item.childrenKey] = {};
      item.children.forEach(child => {
        permissions[item.childrenKey][child.key] = true;
      });
    }
  });

  return permissions;
}


export async function GET(req: NextRequest) {
  try {
    const cookies = req.cookies;

    // Ambil semua role dari DB secara dinamis
    const [roleRows]: any = await db.query(`SELECT name FROM roleEmployee`);
    const dynamicRoles: string[] = roleRows.map((r: any) => r.name.toLowerCase());

    // Tambahkan 'owner' secara eksplisit jika tidak termasuk dalam tabel
    dynamicRoles.push('owner');

    let matchedRole: string | null = null;
    let token: string | null = null;

    // Cek setiap cookie apakah namanya cocok dengan salah satu role
    for (const role of dynamicRoles) {
      const cookie = cookies.get(role);
      if (cookie?.value) {
        matchedRole = role;
        token = decodeURIComponent(cookie.value);
        break;
      }
    }

    if (!matchedRole || !token) {
      return NextResponse.json({ message: 'Unauthorized: No valid token found' }, { status: 401 });
    }

    // Jika role adalah owner
    if (matchedRole === 'owner') {
      const [rows]: any = await db.query(
        `SELECT id, username, email, role FROM owner WHERE token = ? LIMIT 1`,
        [token]
      );
    
      if (!Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }
    
      const user = rows[0];
    
      return NextResponse.json({
        message: 'Authorized',
        user: {
          ...user,
          backofficePermissions: generateFullBackofficePermissions(),
          appPermissions: generateFullAppPermissionsFromTree(),
        },
      }, { status: 200 });
    }
    

    // Role dari tabel user + roleEmployee
    const [userRows]: any = await db.query(
      `SELECT u.id, u.username, u.email, r.name as role, r.backofficePermissions, r.appPermissions
       FROM user u
       LEFT JOIN roleEmployee r ON u.roleId = r.id
       WHERE u.token = ?
       LIMIT 1`,
      [token]
    );

    if (!Array.isArray(userRows) || userRows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const user = userRows[0];

    return NextResponse.json({
      message: 'Authorized',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        backofficePermissions: JSON.parse(user.backofficePermissions || '{}'),
        appPermissions: JSON.parse(user.appPermissions || '{}'),
      },
    }, { status: 200 });

  } catch (error) {
    console.error('GET /api/auth/me error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
