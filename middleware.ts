import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PREFIXES = [
  "/login",
  "/auth/",
  "/hesabim/sifre-yenile",
  "/unsubscribe",
  "/gizlilik",
  "/r/",
  "/api/",
  "/_next/",
  "/icon.svg",
  "/favicon.ico",
]

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return false
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))
}

function hasSupabaseSession(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => {
    const n = c.name
    return n.includes("auth-token") || (n.startsWith("sb-") && n.includes("auth"))
  })
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const isApp =
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/login") &&
    pathname !== "/"

  const isAdmin = pathname.startsWith("/admin")

  if ((isApp || isAdmin) && !hasSupabaseSession(request)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
