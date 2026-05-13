import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Auth middleware is disabled - enable later when ready
export async function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
