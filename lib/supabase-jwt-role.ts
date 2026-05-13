/** JWT içindeki `role` alanını okur (Supabase anon / service_role ayrımı için). */

export function getJwtRoleFromKey(jwt: string): string | null {
  try {
    const p = jwt.split(".")[1]
    if (!p) return null
    const b64 = p.replace(/-/g, "+").replace(/_/g, "/")
    const padLen = (4 - (b64.length % 4)) % 4
    const pad = "=".repeat(padLen)

    let jsonStr: string
    if (typeof globalThis.atob === "function") {
      jsonStr = globalThis.atob(`${b64}${pad}`)
    } else if (typeof Buffer !== "undefined") {
      jsonStr = Buffer.from(`${b64}${pad}`, "base64").toString("utf8")
    } else {
      return null
    }

    const o = JSON.parse(jsonStr) as { role?: string }
    return o.role ?? null
  } catch {
    return null
  }
}
