"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertTriangle, CheckCircle } from "lucide-react"

export default function UyelikIptalPage() {
  const [reason, setReason] = useState("")
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit() {
    if (!reason.trim()) return
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="p-6 max-w-lg">
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="font-semibold text-slate-800 text-lg mb-2">Talebiniz Alındı</h2>
          <p className="text-sm text-slate-500">Üyelik iptali talebiniz ekibimize iletildi. En kısa sürede sizinle iletişime geçeceğiz.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-lg">
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Üyeliğinizi iptal etmek üzeresiniz</p>
            <p className="text-xs text-red-600 mt-1">Bu işlem geri alınamaz. Tüm verileriniz silinecektir.</p>
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium text-slate-600">İptal nedeni *</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="İptal nedeninizi belirtin..."
            rows={4}
            className="mt-1.5"
          />
        </div>

        <Button
          variant="destructive"
          className="w-full"
          disabled={!reason.trim()}
          onClick={handleSubmit}
        >
          İptal Talebini Gönder
        </Button>
      </div>
    </div>
  )
}
