"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Loader2, BellOff } from "lucide-react"

function UnsubscribeContent() {
  const params = useSearchParams()
  const customerId = params.get("cid")
  const companyId = params.get("co")
  const channel = params.get("ch") as "sms" | "email" | "whatsapp" | "all" | null

  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  async function handleUnsubscribe() {
    if (!customerId || !companyId) {
      setError("Geçersiz bağlantı.")
      return
    }
    setLoading(true)
    setError("")

    const res = await fetch("/api/notifications/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, companyId, channel: channel || "all" }),
    })

    const data = await res.json()
    setLoading(false)

    if (data.ok) {
      setDone(true)
    } else {
      setError(data.error || "İşlem başarısız.")
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-800 mb-2">Bildirim Tercihiniz Güncellendi</h1>
            <p className="text-sm text-slate-500">
              Artık {channel === "sms" ? "SMS" : channel === "email" ? "e-posta" : channel === "whatsapp" ? "WhatsApp" : "bildirim"} almayacaksınız.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center">
          <BellOff className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-800 mb-2">Bildirim Aboneliğini İptal Et</h1>
          <p className="text-sm text-slate-500 mb-6">
            {channel === "sms" && "SMS bildirimlerini almak istemiyorsanız aşağıdaki butona tıklayın."}
            {channel === "email" && "E-posta bildirimlerini almak istemiyorsanız aşağıdaki butona tıklayın."}
            {channel === "whatsapp" && "WhatsApp bildirimlerini almak istemiyorsanız aşağıdaki butona tıklayın."}
            {(!channel || channel === "all") && "Tüm bildirimleri almak istemiyorsanız aşağıdaki butona tıklayın."}
          </p>
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <Button onClick={handleUnsubscribe} disabled={loading} variant="destructive" className="w-full">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BellOff className="w-4 h-4 mr-2" />}
            {loading ? "İşleniyor..." : "Bildirimleri İptal Et"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
      <UnsubscribeContent />
    </Suspense>
  )
}
