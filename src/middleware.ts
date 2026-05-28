import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_WWW_AUTHENTICATE, getAdminSecret, isAdminAuthorized } from "@/lib/admin-auth";

export function middleware(request: NextRequest) {
  if (!getAdminSecret()) return NextResponse.next();

  if (isAdminAuthorized(request)) return NextResponse.next();

  return new NextResponse("Wymagane logowanie administratora.", {
    status: 401,
    headers: { "WWW-Authenticate": ADMIN_WWW_AUTHENTICATE }
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
