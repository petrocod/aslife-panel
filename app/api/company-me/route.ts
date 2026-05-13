import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { normalizeCompanyRow, selectCompanyRow, updateCompanyRowWithFallback } from "@/lib/company-db"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

/**
 * Oturum açmış kullanıcının profiles.company_id şirketini okur/günceller.
 * service_role ile RLS engelini aşar (.env.local → SUPABASE_SERVICE_ROLE_KEY).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Oturum gerekli (Authorization: Bearer)." }, { status: 401 })
  }

  const token = authHeader.slice(7).trim()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    return NextResponse.json({ error: "Supabase URL/anon key eksik." }, { status: 500 })
  }

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser()
  if (userErr || !user) {
    return NextResponse.json({ error: "Geçersiz oturum." }, { status: 401 })
  }

  let admin: ReturnType<typeof getSupabaseAdmin>
  try {
    admin = getSupabaseAdmin()
  } catch {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY tanımlı değil.", code: "NO_SERVICE_ROLE" },
      { status: 503 },
    )
  }

  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 })
  }

  if (!profile?.company_id) {
    return NextResponse.json({ company: null })
  }

  const { data, error } = await selectCompanyRow(admin, profile.company_id as string)
  if (error?.code === "EMPTY_RESULT") {
    return NextResponse.json(
      {
        error:
          "Profilde company_id var ama companies içinde bu satır yok veya okunamıyor. Table Editor ile UUID eşleşmesini kontrol edin.",
        code: "COMPANY_ROW_MISSING",
      },
      { status: 404 },
    )
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  if (!data) {
    return NextResponse.json({ error: "Şirket verisi alınamadı." }, { status: 404 })
  }

  return NextResponse.json({ company: normalizeCompanyRow(data) })
}

type PutBody = {
  name?: string
  phone?: string | null
  email?: string | null
  address?: string | null
  location?: string | null
  authorized?: string | null
  founded_at?: string | null
  website?: string | null
  tc_no?: string | null
  tax_number?: string | null
  tax_office?: string | null
  invoice_address?: string | null
  currency?: string
  service_type?: string | null
  language?: string
  timezone?: string
  logo_url?: string | null
}

export async function PUT(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Oturum gerekli (Authorization: Bearer)." }, { status: 401 })
  }

  const token = authHeader.slice(7).trim()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    return NextResponse.json({ error: "Supabase URL/anon key eksik." }, { status: 500 })
  }

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser()
  if (userErr || !user) {
    return NextResponse.json({ error: "Geçersiz oturum." }, { status: 401 })
  }

  let body: PutBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400 })
  }

  const name = body.name?.trim()
  if (!name) {
    return NextResponse.json({ error: "Şirket ünvanı (name) zorunludur." }, { status: 400 })
  }

  let admin: ReturnType<typeof getSupabaseAdmin>
  try {
    admin = getSupabaseAdmin()
  } catch {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY tanımlı değil.", code: "NO_SERVICE_ROLE" },
      { status: 503 },
    )
  }

  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 })
  }

  const companyId = profile?.company_id as string | undefined
  if (!companyId) {
    return NextResponse.json({ error: "Profil şirkete bağlı değil." }, { status: 400 })
  }

  const payload: Record<string, unknown> = {
    name,
    phone: body.phone?.trim() || null,
    email: body.email?.trim() || null,
    address: body.address?.trim() || null,
    location: body.location?.trim() || null,
    authorized: body.authorized?.trim() || null,
    founded_at: body.founded_at?.trim() || null,
    website: body.website?.trim() || null,
    tc_no: body.tc_no?.trim() || null,
    tax_number: body.tax_number?.trim() || null,
    tax_office: body.tax_office?.trim() || null,
    invoice_address: body.invoice_address?.trim() || null,
    currency: body.currency?.trim() || "TRY",
    service_type: body.service_type?.trim() || "Sağlık Merkezi",
    language: body.language?.trim() || "tr",
    timezone: body.timezone?.trim() || "Europe/Istanbul",
    logo_url: body.logo_url?.trim() || null,
  }

  const { error: upErr, strippedColumns } = await updateCompanyRowWithFallback(admin, companyId, payload)
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, strippedColumns })
}
