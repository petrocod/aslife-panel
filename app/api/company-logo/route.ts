import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { parseMissingCompanyColumn } from "@/lib/company-db"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

const BUCKET = "company-logos"

/**
 * Logo yükleme — service_role ile Storage RLS'yi aşar.
 * .env.local: SUPABASE_SERVICE_ROLE_KEY (Supabase → Settings → API → service_role)
 * Storage'da "company-logos" bucket oluşturulmuş ve mümkünse Public olmalı (görüntüleme için).
 */
export async function POST(req: NextRequest) {
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

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Form verisi okunamadı." }, { status: 400 })
  }

  const companyId = formData.get("companyId")
  const file = formData.get("file")
  if (typeof companyId !== "string" || !companyId || !(file instanceof File)) {
    return NextResponse.json({ error: "companyId ve file gerekli." }, { status: 400 })
  }

  const { data: profile, error: pErr } = await userClient
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (pErr || !profile || profile.company_id !== companyId) {
    return NextResponse.json({ error: "Bu şirket için yetkiniz yok." }, { status: 403 })
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Sadece resim dosyası." }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Dosya en fazla 5 MB." }, { status: 400 })
  }

  let admin: ReturnType<typeof getSupabaseAdmin>
  try {
    admin = getSupabaseAdmin()
  } catch {
    return NextResponse.json(
      {
        error:
          "Sunucuda SUPABASE_SERVICE_ROLE_KEY yok. .env.local dosyasına ekleyin (Supabase Dashboard → Settings → API → service_role).",
        code: "NO_SERVICE_ROLE",
      },
      { status: 503 }
    )
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png"
  const path = `${companyId}/logo.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type || "image/png",
    upsert: true,
  })

  if (upErr) {
    return NextResponse.json(
      {
        error: upErr.message,
        hint:
          'Storage\'da "' +
          BUCKET +
          '" adlı bucket oluşturun (Dashboard → Storage → New bucket). İsim tam eşleşmeli.',
      },
      { status: 400 }
    )
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path)
  const publicUrl = pub.publicUrl

  const { error: updErr } = await admin.from("companies").update({ logo_url: publicUrl }).eq("id", companyId)
  if (updErr) {
    const missing = parseMissingCompanyColumn(updErr.message || "")
    return NextResponse.json({
      publicUrl,
      warning: updErr.message,
      hint:
        missing === "logo_url"
          ? "companies.logo_url sütunu yok. supabase/companies_align_app_schema.sql veya add_company_logo_url.sql çalıştırın."
          : "companies güncellenemedi. supabase/companies_align_app_schema.sql ile şemayı güncelleyin.",
    })
  }

  return NextResponse.json({ publicUrl })
}
