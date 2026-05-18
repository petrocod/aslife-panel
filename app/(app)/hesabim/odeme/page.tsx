"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CreditCard, Building2, Copy, CheckCircle2 } from "lucide-react"
import { useCompany } from "@/hooks/useCompany"
import { useCart } from "@/contexts/CartContext"
import { supabase } from "@/lib/supabase-client"
import { formatTry } from "@/lib/catalog/defaults"

function OdemeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { companyId } = useCompany()
  const { items, subtotal, vatAmount, total, itemCount } = useCart()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formHtml, setFormHtml] = useState("")
  const [payMethod, setPayMethod] = useState<"card" | "transfer">("card")
  const [copied, setCopied] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  const source = searchParams.get("source")
  const type = searchParams.get("type")
  const planId = searchParams.get("planId") || undefined
  const packageId = searchParams.get("packageId") || undefined
  const billing = (searchParams.get("billing") as "monthly" | "yearly") || undefined

  const isCartCheckout = source === "cart" || itemCount > 0

  useEffect(() => {
    if (!isCartCheckout && !type) {
      router.push("/hesabim")
    }
  }, [isCartCheckout, type, router])

  async function startCheckout() {
    setLoading(true)
    setError("")

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !companyId) {
      setError("Oturum bilgisi alınamadı.")
      setLoading(false)
      return
    }

    const body =
      isCartCheckout && items.length > 0
        ? { items, userId: user.id, companyId }
        : { type, planId, packageId, billing, userId: user.id, companyId }

    const res = await fetch("/api/payment/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

  if (!isCartCheckout && !type) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  if (isCartCheckout && items.length === 0) {
    return (
      <div className="container mx-auto max-w-2xl py-8 px-4 text-center space-y-4">
        <p className="text-slate-600">Sepetiniz boş.</p>
        <Button asChild>
          <Link href="/hesabim/plan-sec">Alışverişe Başla</Link>
        </Button>
      </div>
    )
  }

  const displayTotal = isCartCheckout ? total : subtotal

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Ödeme</h1>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Sipariş Özeti</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isCartCheckout ? (
            <>
              {items.map((item) => (
                <div key={item.lineId} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.title}
                    {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                  </span>
                  <span className="font-medium">{formatTry(item.unitPrice * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Ara Toplam</span>
                  <span>{formatTry(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>KDV (%20)</span>
                  <span>{formatTry(vatAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Toplam</span>
                  <span>{formatTry(total)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{planId || packageId}</span>
              <span className="text-xl font-bold">—</span>
            </div>
          )}
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
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  {loading ? "Yükleniyor..." : `${formatTry(displayTotal)} Öde`}
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
                    {copied ? (
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <p className="font-medium mb-1">Açıklama kısmına yazınız:</p>
              <p className="font-mono">
                {companyId?.slice(0, 8)} - {isCartCheckout ? "Sepet" : planId || packageId}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Havale/EFT sonrası aktivasyon 1 iş günü içinde yapılır.
            </p>
          </CardContent>
        </Card>
      )}

      {isCartCheckout && (
        <p className="text-center mt-4 text-sm">
          <Link href="/sepet" className="text-orange-600 hover:underline">
            Sepete dön
          </Link>
        </p>
      )}
    </div>
  )
}

export default function OdemePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      }
    >
      <OdemeContent />
    </Suspense>
  )
}
