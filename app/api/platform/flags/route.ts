import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { flagsFromRows, PLATFORM_FLAG_KEYS } from "@/lib/platform-flags"

/** Public read of platform feature toggles (no secrets). */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase.from("feature_flags").select("key, enabled")
    const map = flagsFromRows(data)
    return NextResponse.json({
      flags: {
        [PLATFORM_FLAG_KEYS.onlineRandevu]: map[PLATFORM_FLAG_KEYS.onlineRandevu],
        [PLATFORM_FLAG_KEYS.siniflarModule]: map[PLATFORM_FLAG_KEYS.siniflarModule],
        [PLATFORM_FLAG_KEYS.publicSelfServeTrial]: map[PLATFORM_FLAG_KEYS.publicSelfServeTrial],
      },
    })
  } catch {
    return NextResponse.json({
      flags: {
        online_randevu: false,
        siniflar_module: false,
        public_self_serve_trial: false,
      },
    })
  }
}
