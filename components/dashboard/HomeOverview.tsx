import Link from "next/link"
import { CalendarDays, Heart, Sparkles, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function HomeOverview() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-card via-background to-accent/40 p-6 sm:p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Bugün nasılsınız?</p>
        <h2 className="mt-2 text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
          Kulübünüze hoş geldiniz
        </h2>
        <p className="mt-3 text-muted-foreground text-sm max-w-xl leading-relaxed">
          Randevuları yönetmek ve üyelerinizle yakın kalmak için tek bir yer. Sakin ve düzenli bir gün dileriz.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg" className="rounded-xl">
            <Link href="/randevular/takvim">
              <CalendarDays className="h-4 w-4 mr-2" />
              Takvime git
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-xl border-border bg-card/80">
            <Link href="/musteriler">
              <Users className="h-4 w-4 mr-2" />
              Müşteriler
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-2xl overflow-hidden border-border/80">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-primary">
              <Heart className="h-5 w-5" />
              <CardTitle className="text-lg">Üyeleriniz</CardTitle>
            </div>
            <CardDescription>Müşteri listesi ve güncel bilgiler</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Kayıtları tek yerden takip edin; aradığınız kişiyi hızlıca bulun.
            </p>
            <Link href="/musteriler" className="text-sm font-medium text-primary hover:underline">
              Müşterilere git →
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-2xl overflow-hidden border-border/80 lg:col-span-1 sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-primary">
              <CalendarDays className="h-5 w-5" />
              <CardTitle className="text-lg">Randevular</CardTitle>
            </div>
            <CardDescription>Takvim ve online rezervasyon</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Günlük yoğunluğu görün ve çakışmaları önleyin.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/randevular/takvim"
                className="inline-flex text-sm font-medium text-primary hover:underline"
              >
                Takvim →
              </Link>
              <span className="text-muted-foreground text-sm px-1">·</span>
              <Link
                href="/randevular/online"
                className="inline-flex text-sm font-medium text-primary hover:underline"
              >
                Online →
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl overflow-hidden border-dashed border-border bg-muted/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-5 w-5 text-primary/80" />
              <CardTitle className="text-lg">İpucu</CardTitle>
            </div>
            <CardDescription>Küçük dokunuşlar büyük fark yaratır</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Randevu onayı bildirimi metinlerinizi nazik bir dille güncelleyin; üyeler kendilerini daha iyi hisseder.
            </p>
            <Link
              href="/ayarlar/musteri-bildirimleri"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              Bildirim ayarları →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
