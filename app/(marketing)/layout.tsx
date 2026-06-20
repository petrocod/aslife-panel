import type { Metadata } from "next"
import { MarketingHeader } from "@/components/marketing/MarketingHeader"
import { MarketingFooter } from "@/components/marketing/MarketingFooter"

export const metadata: Metadata = {
  title: "aSistan — Randevu ve İşletme Yönetimi",
  description:
    "Spor salonları ve wellness işletmeleri için randevu, müşteri, ödeme ve bildirim yönetimi. İşletmenizi tek panelden yönetin.",
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  )
}
