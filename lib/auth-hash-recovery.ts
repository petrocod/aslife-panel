import { setAuthSessionCookie } from "@/lib/auth-session-cookie"
import { supabase } from "@/lib/supabase-client"

export type HashRecoveryResult =
  | { status: "none" }
  | { status: "redirected"; href: string }
  | { status: "done"; destination: string }
  | { status: "failed" }

function parseHashParams(): URLSearchParams | null {
  if (typeof window === "undefined") return null
  const hash = window.location.hash.replace(/^#/, "")
  if (!hash.includes("access_token")) return null
  return new URLSearchParams(hash)
}

/** localhost + production BASE_URL → hash'i production'a taşı (yanlış Site URL için). */
export function redirectHashToProductionIfNeeded(): string | null {
  if (typeof window === "undefined") return null

  const hash = window.location.hash
  if (!hash.includes("access_token")) return null

  const host = window.location.hostname
  if (host !== "localhost" && host !== "127.0.0.1") return null

  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").trim().replace(/\/$/, "")
  if (!base || base.includes("localhost") || base.includes("127.0.0.1")) return null

  try {
    const prod = new URL(base)
    if (prod.hostname === host) return null
    return `${prod.origin}/auth/callback${hash}`
  } catch {
    return null
  }
}

export async function completeAuthFromUrlHash(): Promise<HashRecoveryResult> {
  const prodRedirect = redirectHashToProductionIfNeeded()
  if (prodRedirect) {
    window.location.replace(prodRedirect)
    return { status: "redirected", href: prodRedirect }
  }

  const params = parseHashParams()
  if (!params) return { status: "none" }

  const accessToken = params.get("access_token")
  const refreshToken = params.get("refresh_token")
  const type = params.get("type")

  if (!accessToken || !refreshToken) return { status: "failed" }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })
  if (error) return { status: "failed" }

  setAuthSessionCookie(true)
  window.history.replaceState(null, "", window.location.pathname + window.location.search)

  const destination = type === "recovery" ? "/hesabim/sifre-yenile" : "/randevular/takvim"
  return { status: "done", destination }
}
