import Link from "next/link"
import { Button } from "@/components/ui/button"

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
            <span className="text-sm font-bold text-primary-foreground">a</span>
          </div>
          <span className="text-lg font-bold tracking-tight">aSistan</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a href="#ozellikler" className="transition-colors hover:text-foreground">
            Özellikler
          </a>
          <a href="#fiyatlandirma" className="transition-colors hover:text-foreground">
            Fiyatlandırma
          </a>
          <a href="#iletisim" className="transition-colors hover:text-foreground">
            İletişim
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Giriş Yap</Link>
          </Button>
          <Button size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/login">Ücretsiz Dene</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
