"use client"

import { MessageSquare, Mail } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface NotificationSectionProps {
  smsConsent: boolean
  emailConsent: boolean
  whatsappConsent: boolean
  onSmsChange: (v: boolean) => void
  onEmailChange: (v: boolean) => void
  onWhatsappChange: (v: boolean) => void
  title?: string
}

export function NotificationSection({
  smsConsent, emailConsent, whatsappConsent,
  onSmsChange, onEmailChange, onWhatsappChange,
  title = "Bildirim İzinleri",
}: NotificationSectionProps) {
  return (
    <div className="mt-6 pt-6 border-t-2 border-dashed border-slate-200">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 bg-blue-500 rounded-full" />
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <span className="text-xs text-slate-400 ml-1">— Müşteriye gönderilecek bildirim kanalları</span>
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        {/* WhatsApp */}
        <label className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-base">💬</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">WhatsApp izni</p>
              <p className="text-xs text-slate-400">WhatsApp üzerinden randevu bildirimleri gönder</p>
            </div>
          </div>
          <Switch checked={whatsappConsent} onCheckedChange={onWhatsappChange} />
        </label>

        {/* SMS */}
        <label className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">SMS izni</p>
              <p className="text-xs text-slate-400">SMS ile randevu hatırlatmaları gönder</p>
            </div>
          </div>
          <Switch checked={smsConsent} onCheckedChange={onSmsChange} />
        </label>

        {/* Email */}
        <label className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <Mail className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">e-Posta izni</p>
              <p className="text-xs text-slate-400">E-posta ile bildirim ve hatırlatma gönder</p>
            </div>
          </div>
          <Switch checked={emailConsent} onCheckedChange={onEmailChange} />
        </label>
      </div>
    </div>
  )
}
