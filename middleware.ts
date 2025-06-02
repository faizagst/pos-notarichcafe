import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  // Hit internal API untuk ambil user session
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/me`, {
    headers: {
      cookie: request.headers.get('cookie') || '',
    },
  });

  if (!res.ok) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  const { user } = await res.json();

  if (!user || !user.backofficePermissions) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  const pathname = url.pathname;

  // Mapping route ke permission path
  const permissionMap: Record<string, string> = {
    //backoffice
    '/dashboard': 'backofficePermissions.viewDashboard',
    '/reports/sales/summary': 'backofficePermissions.viewReports.sales',
    '/reports/transactions': 'backofficePermissions.viewReports.transactions',
    '/inventory/summary': 'backofficePermissions.viewInventory.summary',
    '/inventory/supplier': 'backofficePermissions.viewInventory.supplier',
    '/inventory/purchaseOrder': 'backofficePermissions.viewInventory.purchaseOrder',
    '/library/bundle_package': 'backofficePermissions.viewLibrary.bundlePackage',
    '/library/discounts': 'backofficePermissions.viewLibrary.discounts',
    '/library/taxes': 'backofficePermissions.viewLibrary.taxes',
    '/library/gratuity': 'backofficePermissions.viewLibrary.gratuity',
    '/modifiers/modifiersLibrary': 'backofficePermissions.viewModifier.modifiersLibrary',
    '/modifiers/modifierCategory': 'backofficePermissions.viewModifier.modifierCategory',
    '/ingredients/ingredientsLibrary': 'backofficePermissions.viewIngredients.ingredientsLibrary',
    '/ingredients/ingredientCategory': 'backofficePermissions.viewIngredients.ingredientsCategory',
    '/ingredients/recipes': 'backofficePermissions.viewIngredients.recipes',
    '/menuNotarich/menuList': 'backofficePermissions.viewMenu.menuList',
    '/menuNotarich/menuCategory': 'backofficePermissions.viewMenu.menuCategory',
    '/recapNotarich/stockCafe': 'backofficePermissions.viewRecap.stockCafe',
    '/recapNotarich/stockInventory': 'backofficePermissions.viewRecap.stockInventory',
    '/employee/employee_slots': 'backofficePermissions.viewEmployees.employeeSlots',
    '/employee/employee_access': 'backofficePermissions.viewEmployees.employeeAccess',

    //app atau cashier
    '/cashier': 'appPermissions.cashier',
    '/cashier/menu': 'appPermissions.menu',
    '/cashier/riwayat': 'appPermissions.riwayat',
  };

  const requiredPermission = permissionMap[pathname];

  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    url.pathname = '/unauthorized';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Helper function untuk cek permission nested
function hasPermission(obj: any, path: string): boolean {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current?.[key] === undefined) return false;
    current = current[key];
  }
  return current === true;
}

// Tentukan route yang akan di-protect
export const config = {
  matcher: [
    //backoffice
    '/dashboard',
    '/reports/:path*',
    '/inventory/:path*',
    '/library/:path*',
    '/modifiers/:path*',
    '/ingredients/:path*',
    '/menuNotarich/:path*',
    '/recapNotarich/:path*',
    '/employee/:path*',
    //app atau cashier
    '/cashier/:path*',
  ],
};
