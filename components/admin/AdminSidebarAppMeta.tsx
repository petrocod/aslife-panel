import { APP_BUILD_TIME, APP_VERSION } from "@/lib/app-meta"
import { formatDate } from "@/lib/utils"

/** Admin sidebar altı: sürüm + son build/deploy zamanı. */
export function AdminSidebarAppMeta() {
  const buildLabel = APP_BUILD_TIME
    ? formatDate(APP_BUILD_TIME, "dd.MM.yyyy HH:mm")
    : null

  return (
    <div className="mt-2 px-3 text-[10px] leading-snug text-slate-400">
      <p>v{APP_VERSION}</p>
      {buildLabel && <p>Son güncelleme: {buildLabel}</p>}
    </div>
  )
}
