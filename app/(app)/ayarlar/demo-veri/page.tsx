"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DemoDataToggle } from "@/components/settings/DemoDataToggle"
import { DEMO_COMPANY_ID, useCompany } from "@/hooks/useCompany"
import { runDemoSeedOp } from "@/lib/demo-data-client"

export default function DemoVeriPage() {
  const { companyId, loading: cidLoading } = useCompany()
  const [busy, setBusy] = useState(false)
  const [statTxt, setStatTxt] = useState("")
  const [errTxt, setErrTxt] = useState("")
  const isDemo = companyId === DEMO_COMPANY_ID

  async function post(op: "seed" | "clear") {
    setErrTxt("")
    setStatTxt("")
    if (!companyId || companyId !== DEMO_COMPANY_ID) return
    setBusy(true)
    try {
      const result = await runDemoSeedOp(op)
      if (!result.ok) throw new Error(result.error || "İstek başarısız")
      if (op === "clear") setStatTxt(result.message || "Silindi.")
      else if (result.stats) {
        const s = result.stats
        setStatTxt(
          `Randevu: ${s.appointments}, Ödeme kaydı: ${s.payments}, Müşteri: ${s.customers}, Çalışan: ${s.employees}, Hizmet: ${s.services}, Paket: ${s.packages}`
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
        <h1 className="text-lg font-semibold text-slate-900">Test verisi</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Takvim, müşteri ve ödeme akışlarını denemek için örnek veri yükleyin veya silin.
        </p>
      </div>

      <DemoDataToggle />

      {!cidLoading && !isDemo && (
        <Card className="border-amber-300 bg-amber-50/80">
          <CardHeader>
            <CardTitle className="text-base">Bu hesap test modunda değil</CardTitle>
            <CardDescription>
              Test verisi yalnızca demo şirket kimliğinde kullanılabilir (giriş yapmadan veya demo hesabı).
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manuel yükleme / silme</CardTitle>
          <CardDescription>
            Son 7 gün ve gelecek 10 gün için dolu takvim, müşteri, ödeme ve paket örnekleri.
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
                  "Yüklenen test verileri silinsin mi? Şirket kaydı ve çalışma saatleri kalır."
                )
              if (ok) void post("clear")
            }}
          >
            Tümünü sil
          </Button>
        </CardContent>
      </Card>

      {statTxt && <p className="text-sm text-green-700">{statTxt}</p>}
      {errTxt && <p className="text-sm text-destructive">{errTxt}</p>}
    </div>
  )
}
