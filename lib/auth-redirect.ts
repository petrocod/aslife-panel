/** Supabase auth redirect — query param kullanma (allowlist tam eşleşme ister). */

export function getAuthCallbackBaseUrl(): string {
  return (
    (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "")
  )
}

export function getAuthCallbackUrl(): string {
  const base =
    (typeof window !== "undefined" ? window.location.origin : null) ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:3000"

  return `${base.replace(/\/$/, "")}/auth/callback`
}
