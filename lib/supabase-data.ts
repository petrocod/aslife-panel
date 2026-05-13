/**
 * Veri katmanı: varsayılan olarak `supabase-client` ile aynı oturumu kullanır (RLS uygulanır).
 *
 * Yerel geliştirme sırasında RLS / anon anahtarı yüzünden hiçbir kayıt gelmiyorsa,
 * GEÇICI olarak `.env.local` içine NEXT_PUBLIC_SUPABASE_DEV_BYPASS anahtarı
 * ekleyebilirsiniz — Supabase Dashboard’daki anon public anahtarı (veya teknik olarak
 * service_role; güvenlik riski, üretime koymayın). Boş ise her zaman anon+oturum kullanılır.
 */
import { createClient } from "@supabase/supabase-js"

import { supabase } from "./supabase-client"

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim()
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim()
const bypassRaw = (process.env.NEXT_PUBLIC_SUPABASE_DEV_BYPASS || "").trim()
const useBypass = Boolean(url && bypassRaw && bypassRaw !== anonKey)

const dataClientExplicit =
  useBypass && url
    ? createClient(url, bypassRaw, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null

export const supabaseData = dataClientExplicit ?? supabase
