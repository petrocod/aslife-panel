/** Per-user module access within a company (profiles.feature_permissions). */

export const PERMISSION_MODULES = [
  { key: "randevular", label: "Randevular" },
  { key: "odemeler", label: "Ödemeler" },
  { key: "finans", label: "Finans" },
  { key: "musteriler", label: "Müşteriler" },
  { key: "hizmetler", label: "Hizmetler" },
  { key: "urunler", label: "Ürünler" },
  { key: "pazarlama", label: "Pazarlama" },
  { key: "asistan", label: "Asistan (BI)" },
  { key: "ayarlar", label: "Ayarlar" },
  { key: "bildirim_paketleri", label: "Bildirim Paketleri" },
] as const

export type PermissionModuleKey = (typeof PERMISSION_MODULES)[number]["key"]

export type FeaturePermissionsMap = Partial<Record<PermissionModuleKey, boolean>>

/** null/undefined = full access (legacy). */
export function canAccessModule(
  permissions: FeaturePermissionsMap | null | undefined,
  module: PermissionModuleKey,
  role: string | null
): boolean {
  if (role === "owner" || role === "manager") {
    if (!permissions || Object.keys(permissions).length === 0) return true
    return permissions[module] !== false
  }
  if (role === "employee") {
    if (module === "finans") return false
    if (!permissions || Object.keys(permissions).length === 0) {
      return module !== "finans" && module !== "pazarlama" && module !== "asistan"
    }
    return permissions[module] === true
  }
  return true
}

export function defaultPermissionsForRole(role: string): FeaturePermissionsMap {
  if (role === "employee") {
    return {
      randevular: true,
      odemeler: true,
      musteriler: true,
      hizmetler: true,
      urunler: true,
      ayarlar: false,
      bildirim_paketleri: false,
      finans: false,
      pazarlama: false,
      asistan: false,
    }
  }
  return {}
}

/** Map sidebar href prefix → permission module */
export function moduleForPath(pathname: string): PermissionModuleKey | null {
  if (pathname.startsWith("/randevular")) return "randevular"
  if (pathname.startsWith("/odemeler")) return "odemeler"
  if (pathname.startsWith("/admin/finance")) return "finans"
  if (pathname.startsWith("/musteriler")) return "musteriler"
  if (pathname.startsWith("/hizmetler")) return "hizmetler"
  if (pathname.startsWith("/urunler")) return "urunler"
  if (pathname.startsWith("/pazarlama")) return "pazarlama"
  if (pathname.startsWith("/asistan")) return "asistan"
  if (pathname.startsWith("/ayarlar")) return "ayarlar"
  if (pathname.startsWith("/bildirim-paketleri")) return "bildirim_paketleri"
  return null
}
