"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CreditCard, Building2, Copy, CheckCircle2 } from "lucide-react"
import { useCompany } from "@/hooks/useCompany"
import { supabase } from "@/lib/supabase-client"

function OdemeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { companyId } = useCompany()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formHtml, setFormHtml] = useState("")
  const [payMethod, setPayMethod] = useState<"card" | "transfer">("card")
  const [copied, setCopied] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  const type = searchParams.get("type") as string
  const planId = searchParams.get("planId") || undefined
  const packageId = searchParams.get("packageId") || undefined

  const priceMap: Record<string, string> = {
    asistan: "750", asistan_plus: "1.500", asistan_pro: "2.100",
    sms_500: "275", sms_1000: "500", sms_3000: "1.350",
    wp_500: "275", wp_1000: "500", wp_3000: "1.350",
    user_1: "2.592", user_2: "5.184",
  }
  const nameMap: Record<string, string> = {
    asistan: "ASiSTAN (Tek Kullanıcı)", asistan_plus: "ASiSTAN +", asistan_pro: "ASiSTAN PRO",
    sms_500: "500 SMS Kredisi", sms_1000: "1000 SMS Kredisi", sms_3000: "3000 SMS Kredisi",
    wp_500: "500 WhatsApp Kredisi", wp_1000: "1000 WhatsApp Kredisi", wp_3000: "3000 WhatsApp Kredisi",
    user_1: "1 Ek Kullanıcı", user_2: "2 Ek Kullanıcı",
  }

  const itemKey = planId || packageId || ""
  const displayPrice = priceMap[itemKey] || "—"
  const displayName = nameMap[itemKey] || "Paket"

  async function startCheckout() {
    setLoading(true)
    setError("")

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !companyId) {
      setError("Oturum bilgisi alınamadı.")
      setLoading(false)
      return
    }

    const res = await fetch("/api/payment/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, planId, packageId, userId: user.id, companyId }),
    })

    const data = await res.json()

    if (data.checkoutFormContent) {
      setFormHtml(data.checkoutFormContent)
    } else {
      setError(data.error || "Ödeme başlatılamadı.")
    }
    setLoading(false)
  }

  useEffect(() => {
    if (formHtml && formRef.current) {
      formRef.current.innerHTML = formHtml
      const scripts = formRef.current.querySelectorAll("script")
      scripts.forEach((script) => {
        const newScript = document.createElement("script")
        if (script.src) newScript.src = script.src
        else newScript.textContent = script.textContent
        document.body.appendChild(newScript)
      })
    }
  }, [formHtml])

  function handleCopyIban() {
    navigator.clipboard.writeText("TR12 0001 0012 3456 7890 1234 56")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!type) {
    router.push("/hesabim")
    return null
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Ödeme</h1>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Sipariş Özeti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{displayName}</span>
            <span className="text-xl font-bold">{displayPrice} ₺</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 mb-6">
        <Button
          variant={payMethod === "card" ? "default" : "outline"}
          className="flex-1"
          onClick={() => setPayMethod("card")}
        >
          <CreditCard className="w-4 h-4 mr-2" /> Kredi Kartı
        </Button>
        <Button
          variant={payMethod === "transfer" ? "default" : "outline"}
          className="flex-1"
          onClick={() => setPayMethod("transfer")}
        >
          <Building2 className="w-4 h-4 mr-2" /> Havale / EFT
        </Button>
      </div>

      {payMethod === "card" && (
        <Card>
          <CardContent className="pt-6">
            {formHtml ? (
              <div ref={formRef} />
            ) : (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  iyzico güvenli ödeme sayfasına yönlendirileceksiniz.
                </p>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button onClick={startCheckout} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                  {loading ? "Yükleniyor..." : `${displayPrice} ₺ Öde`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {payMethod === "transfer" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Banka Bilgileri</p>
              <div className="grid grid-cols-[100px_1fr] gap-y-1 text-sm">
                <span className="text-muted-foreground">Banka:</span>
                <span>Ziraat Bankası</span>
                <span className="text-muted-foreground">Hesap Adı:</span>
                <span>aSistan Yazılım Ltd. Şti.</span>
                <span className="text-muted-foreground">IBAN:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">TR12 0001 0012 3456 7890 1234 56</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCopyIban}>
                    {copied ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <p className="font-medium mb-1">Açıklama kısmına yazınız:</p>
              <p className="font-mono">{companyId?.slice(0, 8)} - {displayName}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Havale/EFT sonrası aktivasyon 1 iş günü içinde yapılır. Destek için destek sayfasından ticket açabilirsiniz.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function OdemePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
      <OdemeContent />
    </Suspense>
  )
}
