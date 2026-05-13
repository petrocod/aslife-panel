import { createClient } from "@supabase/supabase-js"
import { NextRequest } from "next/server"

export async function verifyUserBearer(
  req: NextRequest
): Promise<{ ok: true; userId: string } | { ok: false }> {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false }
  }
  const token = authHeader.slice(7).trim()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    return { ok: false }
  }
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser()
  if (error || !user) {
    return { ok: false }
  }
  return { ok: true, userId: user.id }
}

export function verifyCron(req: NextRequest): boolean {
  const secret = (process.env.CRON_SECRET || "").trim()
  if (!secret) return false
  const h = req.headers.get("x-cron-secret")
  return h === secret
}
