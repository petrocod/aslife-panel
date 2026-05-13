"use client"

import { CreditCard, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function OdemeBilgileriPage() {
  return (
    <div className="p-6 max-w-lg">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Ödeme Yöntemleri</h2>

        <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center">
          <CreditCard className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 mb-1">Kayıtlı kart bulunamadı</p>
          <p className="text-xs text-slate-400 mb-4">Ödeme yöntemi ekleyerek aboneliğinizi yönetin.</p>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Kart Ekle
          </Button>
        </div>
      </div>
    </div>
  )
}
