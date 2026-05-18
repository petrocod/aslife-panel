"use client"

import { AlertCircle } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCancel: () => void
  onContinue: () => void
  message?: string
}

const DEFAULT_MESSAGE =
  "Seçilen çalışan veya hizmet yeri bu saatte başka bir randevu ile çakışıyor. Yine de devam etmek istiyor musunuz?"

export function ConflictWarnDialog({
  open,
  onOpenChange,
  onCancel,
  onContinue,
  message,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px] p-0 overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">Kesişen Randevu</h3>
        </div>
        <div className="px-5 py-5 text-center space-y-4">
          <div className="flex justify-center">
            <MotionIcon />
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-left">
            <p className="text-xs text-amber-700 leading-relaxed">{message || DEFAULT_MESSAGE}</p>
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-10 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors"
          >
            Devam Et
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MotionIcon() {
  return (
    <div className="w-16 h-16 rounded-full bg-amber-400 flex items-center justify-center shadow-lg">
      <AlertCircle className="h-8 w-8 text-white" />
    </div>
  )
}
