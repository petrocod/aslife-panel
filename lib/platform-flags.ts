/** System-wide feature flags (feature_flags table). */

export const PLATFORM_FLAG_KEYS = {
  onlineRandevu: "online_randevu",
  siniflarModule: "siniflar_module",
  publicSelfServeTrial: "public_self_serve_trial",
} as const

export type PlatformFlagKey = (typeof PLATFORM_FLAG_KEYS)[keyof typeof PLATFORM_FLAG_KEYS]

export const SUPER_ADMIN_ONLY_FLAGS: PlatformFlagKey[] = [
  PLATFORM_FLAG_KEYS.publicSelfServeTrial,
]

export type PlatformFlagsMap = Record<PlatformFlagKey, boolean>

const DEFAULT_FLAGS: PlatformFlagsMap = {
  [PLATFORM_FLAG_KEYS.onlineRandevu]: false,
  [PLATFORM_FLAG_KEYS.siniflarModule]: false,
  [PLATFORM_FLAG_KEYS.publicSelfServeTrial]: false,
}

export function flagsFromRows(
  rows: { key: string; enabled: boolean }[] | null | undefined
): PlatformFlagsMap {
  const out = { ...DEFAULT_FLAGS }
  for (const row of rows ?? []) {
    if (row.key in out) {
      out[row.key as PlatformFlagKey] = Boolean(row.enabled)
    }
  }
  return out
}
