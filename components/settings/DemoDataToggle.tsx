"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  DEMO_DATA_STORAGE_KEY,
  fetchDemoDataStatus,
  runDemoSeedOp,
} from "@/lib/demo-data-client"
import { DEMO_COMPANY_ID, useCompany } from "@/hooks/useCompany"

/** Ayarlar → test verisi: tek anahtar ile yükle / sil. */
export function DemoDataToggle() {
  const router = useRouter()
  const { companyId, loading: companyLoading } = useCompany()
  const isDemo = companyId === DEMO_COMPANY_ID

  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    if (!isDemo) {
      setReady(true)
      return
    }
    try {
      const { hasData } = await fetchDemoDataStatus()
      setOn(hasData)
      localStorage.setItem(DEMO_DATA_STORAGE_KEY, hasData ? "1" : "0")
    } catch {
      setOn(localStorage.getItem(DEMO_DATA_STORAGE_KEY) === "1")
    } finally {
      setReady(true)
    }
  }, [isDemo])

  useEffect(() => {
    if (!companyLoading) void refresh()
  }, [companyLoading, refresh])

  async function handleToggle(checked: boolean) {
    if (!isDemo || busy) return
    setErr("")
    if (!checked) {
      const ok = window.confirm(
        "Yüklenen test verileri (müşteri, randevu, ödeme…) silinsin mi? Şirket kaydı kalır."
      )
      if (!ok) return
    }
    setBusy(true)
    const result = await runDemoSeedOp(checked ? "seed" : "clear")
    setBusy(false)
    if (!result.ok) {
      setErr(result.error || "Hata")
      return
    }
    setOn(checked)
    localStorage.setItem(DEMO_DATA_STORAGE_KEY, checked ? "1" : "0")
    router.refresh()
    window.dispatchEvent(new CustomEvent("inasistan-demo-data-changed"))
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div>
        <Label htmlFor="demo-data-toggle" className="text-sm font-medium cursor-pointer">
          Test verisi
        </Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Açık: örnek takvim ve müşteri verisi yüklenir. Kapalı: silinir.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {busy && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        <Switch
          id="demo-data-toggle"
          checked={on}
          disabled={!isDemo || busy || !ready || companyLoading}
          onCheckedChange={(v) => void handleToggle(v)}
        />
      </div>
      {err && <p className="text-xs text-destructive w-full mt-2">{err}</p>}
    </div>
  )
}
