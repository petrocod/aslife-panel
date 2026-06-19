import { APP_VERSION, SALES_EMAIL } from "@/lib/app-meta"

/** Sidebar altı: sürüm + satış e-postası (tarih/saat yok). */
export function SidebarAppMeta() {
  return (
    <div className="mt-2 border-t border-sidebar-foreground/10 pt-2 space-y-0.5 text-[10px] leading-snug text-sidebar-muted">
      <p>v{APP_VERSION}</p>
      <a
        href={`mailto:${SALES_EMAIL}`}
        className="block truncate hover:text-sidebar-foreground/90"
      >
        {SALES_EMAIL}
      </a>
    </div>
  )
}
