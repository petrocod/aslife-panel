import { createClient } from "@supabase/supabase-js"

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }

  const companyId = "00000000-0000-0000-0000-000000000001"
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const payload = {
    company_id: companyId,
    name: "E2E TEST HEDEF KITLESI",
    filters: {
      time: { startDate: "2026-04-01", endDate: "2026-05-05" },
      customer: { hasAppointments: true },
      location: { country: "Turkiye" },
    },
  }

  const ins = await sb.from("target_audiences").insert(payload).select("id").single()
  if (ins.error) throw ins.error
  const id = ins.data.id
  console.log("CREATED_ID", id)

  const urls = [
    "http://localhost:3000/pazarlama/hedef-kitleler",
    `http://localhost:3000/pazarlama/hedef-kitleler/yeni?id=${id}`,
    `http://localhost:3000/pazarlama/hedef-kitleler/${id}`,
  ]
  for (const u of urls) {
    const r = await fetch(u)
    console.log("URL", u, "STATUS", r.status)
  }

  const upd = await sb.from("target_audiences").update({ name: "E2E TEST HEDEF KITLESI GUNCEL" }).eq("id", id)
  if (upd.error) throw upd.error
  const check = await sb.from("target_audiences").select("id,name").eq("id", id).single()
  if (check.error) throw check.error
  console.log("UPDATED_NAME", check.data.name)

  const del = await sb.from("target_audiences").delete().eq("id", id)
  if (del.error) throw del.error
  const checkDel = await sb.from("target_audiences").select("id").eq("id", id).maybeSingle()
  console.log("DELETED_OK", !checkDel.data)
}

run().catch((e) => {
  console.error("E2E_FAIL", e?.message || e)
  process.exit(1)
})
