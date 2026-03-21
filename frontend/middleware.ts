import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Paths that require authentication
  const protectedPaths = ['/dashboard', '/snippet', '/admin'];
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

  // If path is protected and no token, redirect to login
  if (isProtectedPath && !token) {
    const url = new URL('/login', request.url);
    return NextResponse.redirect(url);
  }

  // If already logged in and hitting login page, redirect to dashboard
  if (pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};