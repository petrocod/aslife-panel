"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DEMO_COMPANY_ID, useCompany } from "@/hooks/useCompany"

export default function DemoVeriPage() {
  const { companyId, loading: cidLoading } = useCompany()
  const [busy, setBusy] = useState(false)
  const [statTxt, setStatTxt] = useState("")
  const [errTxt, setErrTxt] = useState("")
  const isDemo = companyId === DEMO_COMPANY_ID

  async function post(op: "seed" | "clear") {
    setErrTxt("")
    setStatTxt("")
    if (!companyId) return
    if (companyId !== DEMO_COMPANY_ID) return
    setBusy(true)
    try {
      const res = await fetch("/api/demo-seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op, companyId: DEMO_COMPANY_ID }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "İstek başarısız")
      if (op === "clear") setStatTxt(data.message || "Silindi.")
      else if (data.stats) {
        const s = data.stats
        setStatTxt(
          `Randevu: ${s.appointments}, Yaklaşık tahsilat kaydı: ${s.payments}, Müşteri: ${s.customers}, Çalışan: ${s.employees}, Hizmet: ${s.services}, Paket: ${s.packages}`
        )
      }
    } catch (e: unknown) {
      setErrTxt(e instanceof Error ? e.message : "Hata")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Test verisi (Demo)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Randevu takvimi, müşteriler, ödemeler ve paket akışlarını denemek için yapay veri — yalnızca demo şirket
          kimliği üzerinde çalışır (giriş yapmadan veya demo oturumunda kullanın).
        </p>
      </div>

      {!cidLoading && !isDemo && (
        <Card className="border-amber-300 bg-amber-50/80">
          <CardHeader>
            <CardTitle className="text-base">Bu hesap demo değil</CardTitle>
            <CardDescription>
              Test verisi yükleme şu an için yalnızca demo şirket kimliğinde etkindir.
              Gerçek şirkette denemek için giriş yapmadan kullanın.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Çoklu dolu takvim + tek tıkta temizlik</CardTitle>
          <CardDescription>
            Son <strong>7 gün</strong> ile <strong>gelecek 10 gün</strong> için her günde yaklaşık 7 randevu
            (aynı saatte farklı personeller ve aynı personelde üst üste bindirilmiş slotlar dahil); tutarları
            farklı, bir kısmı iptalli, yaklaşık yarısı ödeme kayıtlılı; kampanya, SMS paketi ve komisyon kuralı
            örneği eklenir.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={busy || !isDemo || cidLoading}
            onClick={() => void post("seed")}
          >
            {busy ? "…" : "Test verilerini yükle"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy || !isDemo || cidLoading}
            onClick={() => {
              const ok =
                typeof window !== "undefined" &&
                window.confirm(
                  "Demo şirketindeki yüklü tüm işletme verisi (yerler, çalışanlar, müşteri, randevu, paket…) silinsin mi? Şirket satırı ve çalışma saatleri kalır."
                )
              if (ok) void post("clear")
            }}
          >
            Tümünü tek tıkta sil
          </Button>
        </CardContent>
      </Card>

      {statTxt && <p className="text-sm text-green-700">{statTxt}</p>}
      {errTxt && <p className="text-sm text-destructive">{errTxt}</p>}

      <Card className="border-slate-200 bg-slate-50/80">
        <CardHeader>
          <CardTitle className="text-base">Sistem veri çekemiyorsa</CardTitle>
          <CardDescription>
            <p>Veriler yüklenmiyorsa lütfen sayfayı yenileyin veya destek ekibimiz ile iletişime geçin.</p>
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
