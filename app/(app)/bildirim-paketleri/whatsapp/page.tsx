import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function WhatsappPage() {
  return (
    <div className="p-6">
      <div className="flex justify-end mb-4">
        <Link href="/hesabim/ek-paketler">
          <Button variant="outline" size="sm" className="text-xs">Whatsapp paketlerine git →</Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">💬</span>
        </div>
        <h3 className="font-semibold text-slate-700 mb-2">Whatsapp Paketi Yok</h3>
        <p className="text-sm text-slate-500 mb-4">Henüz bir Whatsapp paketiniz bulunmuyor.</p>
        <Link href="/hesabim/ek-paketler">
          <Button size="sm">Paket Satın Al</Button>
        </Link>
      </div>
    </div>
  )
}
