import Link from "next/link"
import {
  CalendarDays,
  Users,
  Bell,
  CreditCard,
  Globe,
  Megaphone,
  Bot,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DEFAULT_PLANS } from "@/lib/catalog/defaults"
import { cn } from "@/lib/utils"

const features = [
  {
    icon: CalendarDays,
    title: "Randevu Takvimi",
    description: "Günlük randevularınızı tek ekrandan planlayın, düzenleyin ve takip edin.",
  },
  {
    icon: Globe,
    title: "Online Randevu",
    description: "Müşterileriniz 7/24 kendi başlarına randevu alabilsin.",
  },
  {
    icon: Users,
    title: "Müşteri Yönetimi",
    description: "Müşteri kayıtları, geçmiş işlemler ve paket takibi tek yerde.",
  },
  {
    icon: Bell,
    title: "SMS & WhatsApp",
    description: "Randevu hatırlatmaları ve kampanyalar için otomatik bildirimler.",
  },
  {
    icon: CreditCard,
    title: "Ödeme & Finans",
    description: "Tahsilat, kasa ve gelir-gider raporlarını kolayca yönetin.",
  },
  {
    icon: Megaphone,
    title: "Pazarlama",
    description: "Hedef kitleye kampanya gönderin, işletmenizi büyütün.",
  },
]

export default function MarketingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/8 via-background to-background" />
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
              Spor & wellness işletmeleri için
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              İşletmenizi{" "}
              <span className="text-primary">kolayca</span> yönetin
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              aSistan ile randevu, müşteri, ödeme ve bildirim süreçlerinizi tek panelde toplayın.
              Zaman kazanın, müşteri memnuniyetini artırın.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild className="w-full sm:w-auto">
                <Link href="/login">Hemen Başla</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                <a href="#fiyatlandirma">Planları İncele</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="ozellikler" className="border-t border-border/60 bg-card/40 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Her şey tek yerde</h2>
            <p className="mt-4 text-muted-foreground">
              Günlük operasyonlarınız için ihtiyacınız olan tüm araçlar, sade ve kullanımı kolay bir arayüzde.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="border-border/80 bg-background shadow-sm transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{f.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="mt-12 flex items-center justify-center gap-3 rounded-2xl border border-border bg-background px-6 py-5 text-sm text-muted-foreground">
            <Bot className="h-5 w-5 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">aSistan PRO</strong> planında yapay zeka destekli iş raporları da dahil.
            </span>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="fiyatlandirma" className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Şeffaf fiyatlandırma</h2>
            <p className="mt-4 text-muted-foreground">
              İşletmenizin büyüklüğüne uygun planı seçin. Tüm planlarda SMS kredisi dahildir.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {DEFAULT_PLANS.map((plan) => (
              <Card
                key={plan.id}
                className={cn(
                  "relative flex flex-col border-border/80 shadow-sm",
                  plan.highlighted && "border-primary ring-2 ring-primary/20"
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                    Popüler
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name_tr}</CardTitle>
                  <CardDescription>{plan.description_tr}</CardDescription>
                  <div className="pt-2">
                    <span className="text-3xl font-bold text-foreground">{plan.monthly_price_hint}</span>
                    <span className="text-muted-foreground"> / ay</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ul className="mb-6 flex-1 space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      {plan.max_users} kullanıcı
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      {plan.sms_included.toLocaleString("tr-TR")} SMS / ay
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      Randevu & müşteri yönetimi
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      Ödeme takibi
                    </li>
                  </ul>
                  <Button
                    variant={plan.highlighted ? "default" : "outline"}
                    className="w-full"
                    asChild
                  >
                    <Link href="/login">Başla</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 bg-primary/5 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            İşletmenizi bir adım öne taşıyın
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Sorularınız mı var? Bize yazın — size en uygun planı birlikte belirleyelim.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/login">Panele Giriş</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="mailto:satis@aslife.com.tr">satis@aslife.com.tr</a>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
