import Link from "next/link"

export function MarketingFooter() {
  return (
    <footer id="iletisim" className="border-t border-border bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">a</span>
              </div>
              <span className="text-lg font-bold">aSistan</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-[hsl(var(--sidebar-muted))]">
              Spor ve wellness işletmeleri için randevu, müşteri ve operasyon yönetimi platformu.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">Bağlantılar</h3>
            <ul className="space-y-2 text-sm text-[hsl(var(--sidebar-muted))]">
              <li>
                <Link href="/login" className="hover:text-[hsl(var(--sidebar-foreground))]">
                  Giriş Yap
                </Link>
              </li>
              <li>
                <Link href="/gizlilik" className="hover:text-[hsl(var(--sidebar-foreground))]">
                  Gizlilik Politikası
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">İletişim</h3>
            <p className="text-sm text-[hsl(var(--sidebar-muted))]">
              <a href="mailto:satis@aslife.com.tr" className="hover:text-[hsl(var(--sidebar-foreground))]">
                satis@aslife.com.tr
              </a>
            </p>
            <p className="mt-2 text-xs text-[hsl(var(--sidebar-muted))]">Aslife</p>
          </div>
        </div>

        <div className="mt-10 border-t border-[hsl(var(--sidebar-border))] pt-6 text-center text-xs text-[hsl(var(--sidebar-muted))]">
          © {new Date().getFullYear()} aSistan — Aslife. Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  )
}
