/** PUBLIC_SIGNUP_ENABLED=true → Kayıt Ol açık. Varsayılan: kapalı (invite-only). */

export function isPublicSignupEnabled(): boolean {
  const flag = (process.env.PUBLIC_SIGNUP_ENABLED || "").trim().toLowerCase()
  if (flag === "true") return true
  if (flag === "false") return false
  return process.env.NODE_ENV === "development"
}
