/** Middleware reads auth cookies; browser client stores session in localStorage — sync a marker cookie. */

export function getSupabaseAuthCookieName(): string {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim()
  const ref = url.match(/https?:\/\/([^.]+)\.supabase\.co/i)?.[1]
  return ref ? `sb-${ref}-auth-token` : "sb-auth-token"
}

export function setAuthSessionCookie(active: boolean): void {
  if (typeof document === "undefined") return
  const name = getSupabaseAuthCookieName()
  if (active) {
    const maxAge = 60 * 60 * 24 * 7
    document.cookie = `${name}=1; path=/; max-age=${maxAge}; SameSite=Lax`
  } else {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`
  }
}
