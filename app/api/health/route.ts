import { NextResponse } from "next/server"

import { getJwtRoleFromKey } from "@/lib/supabase-jwt-role"

export const runtime = "nodejs"

/**
 * Projede Supabase bağlantısının ve anon anahtarının okuyabildiğini kontrol eder (RLS dahil — boş liste de “başarı”dır).
 */
export async function GET() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim()
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim()

  const out: Record<string, unknown> = {
    ts: new Date().toISOString(),
    hasSupabaseUrl: Boolean(url.startsWith("http")),
    hasAnonKey: anon.length > 24,
    restProbe: null as { status: number; ok: boolean; bodySnippet?: string } | null,
  }

  if (url.startsWith("http") && anon) {
    try {
      const probe = `${url.replace(/\/$/, "")}/rest/v1/companies?select=id&limit=1`
      const res = await fetch(probe, {
        headers: {
          apikey: anon,
          Authorization: `Bearer ${anon}`,
          Accept: "application/json",
          Prefer: "count=exact",
        },
        cache: "no-store",
        next: { revalidate: 0 },
      })
      let bodySnippet = ""
      try {
        const t = await res.text()
        bodySnippet = t.slice(0, 200)
      } catch {
        bodySnippet = ""
      }
      out.restProbe = {
        status: res.status,
        ok: res.ok || (res.status >= 200 && res.status < 300),
        bodySnippet: bodySnippet || undefined,
      }
    } catch (e: unknown) {
      out.restProbe = {
        status: 0,
        ok: false,
        bodySnippet: e instanceof Error ? e.message : "fetch_failed",
      }
    }
  }

  const roleHint = anon.length > 20 ? getJwtRoleFromKey(anon) : null
  const warnings: string[] = []
  if (roleHint === "service_role") {
    warnings.push(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY yanlışlıkla service_role ile doldurulmuş. Supabase Dashboard → Project Settings → API → "anon" / "public" anahtarını bu değişkene yapıştırın. SUPABASE_SERVICE_ROLE_KEY ayrı satırda kalır.'
    )
  }
  return NextResponse.json({ ...out, jwtRoleHint: roleHint, warnings })
}
