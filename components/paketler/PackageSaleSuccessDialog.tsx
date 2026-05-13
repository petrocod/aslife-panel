"use client"

import { CircleCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type PackageSaleSuccessInfo = {
  packageId: string
  customerPackageId: string
  customerId: string
  packageName: string
  customerName: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  info: PackageSaleSuccessInfo | null
  onPlan: () => void
  onPlanLater: () => void
}

export function PackageSaleSuccessDialog(props: Props) {
  const { open, onOpenChange, info, onPlan, onPlanLater } = props
  if (!info) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl border border-slate-200 p-0 shadow-xl sm:max-w-md">
        <DialogHeader className="space-y-3 border-b border-slate-100 px-6 py-5 text-left">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
              <CircleCheck className="h-5 w-5 text-emerald-600" aria-hidden />
            </span>
            Tebrikler
          </DialogTitle>
          <p className="text-sm leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-800">{info.packageName}</span> paketiniz{" "}
            <span className="font-semibold text-slate-800">{info.customerName}</span> adlı müşterinize
            tanımlanmıştır. Şimdi tanımladığınız paketi planlayabilirsiniz.
          </p>
        </DialogHeader>
        <DialogFooter className="flex-row items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:justify-end">
          <button
            type="button"
            className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
            onClick={() => onPlanLater()}
          >
            Daha sonra planla
          </button>
          <Button
            type="button"
            className="min-w-[7rem] bg-[#008cff] hover:bg-[#0078e8]"
            onClick={() => onPlan()}
          >
            Planla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
