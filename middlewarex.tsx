import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Cek apakah URL mengarah ke back-office
  if (req.nextUrl.pathname.startsWith("/dashboard") ||
      req.nextUrl.pathname.startsWith("/employee") ||
      req.nextUrl.pathname.startsWith("/ingredients") ||
      req.nextUrl.pathname.startsWith("/inventory") ||
      req.nextUrl.pathname.startsWith("/library") ||
      req.nextUrl.pathname.startsWith("/payment") ||
      req.nextUrl.pathname.startsWith("/reports") ||
      req.nextUrl.pathname.startsWith("/suppliers")) {
    
    // Cek apakah ada cookie "user"
    const userCookie = req.cookies.get("user");
    if (!userCookie) {
      // Redirect ke halaman login
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("from", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }
  
  // Jika sudah login atau bukan halaman yang dibatasi, lanjutkan
  return NextResponse.next();
}

// Atur matcher agar middleware hanya berjalan untuk rute yang dibatasi
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/employee/:path*",
    "/ingredients/:path*",
    "/inventory/:path*",
    "/library/:path*",
    "/payment/:path*",
    "/reports/:path*",
    "/suppliers/:path*"
  ],
};
