import { createClient } from "@supabase/supabase-js"

import { getJwtRoleFromKey } from "@/lib/supabase-jwt-role"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const r = getJwtRoleFromKey(key)
  if (key && r === "service_role") {
    console.error(
      "[Inasistan] .env içinde NEXT_PUBLIC_SUPABASE_ANON_KEY yanlışlıkla service_role gibi görünüyor. Supabase Dashboard → Settings → API → anon public anahtarını yapıştırın (JWT içinde role: anon olmalı)."
    )
  }
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
