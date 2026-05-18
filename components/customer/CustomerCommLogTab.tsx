"use client"

import { useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import { tr } from "date-fns/locale"
import { Loader2, MessageSquare, Mail, Phone } from "lucide-react"
import { supabaseData as supabase } from "@/lib/supabase-data"

type LogRow = {
  id: string
  channel: string
  message_body: string
  template_key: string | null
  status: string
  sent_at: string
}

const CHANNEL_ICON: Record<string, typeof MessageSquare> = {
  sms: Phone,
  email: Mail,
  whatsapp: MessageSquare,
}

export function CustomerCommLogTab({ customerId }: { customerId: string }) {
  const [rows, setRows] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase
      .from("customer_communication_log")
      .select("id, channel, message_body, template_key, status, sent_at")
      .eq("customer_id", customerId)
      .order("sent_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (!cancelled) setRows((data as LogRow[]) ?? [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [customerId])

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        Henüz kayıtlı mesaj yok. SMS, e-posta veya WhatsApp gönderildiğinde burada görünür.
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl space-y-3">
      {rows.map((row) => {
        const Icon = CHANNEL_ICON[row.channel] ?? MessageSquare
        return (
          <div
            key={row.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 uppercase">
                <Icon className="h-3.5 w-3.5" />
                {row.channel}
                {row.template_key && (
                  <span className="text-slate-400 normal-case">· {row.template_key}</span>
                )}
              </span>
              <span className="text-xs text-slate-400">
                {format(parseISO(row.sent_at), "dd MMM yyyy HH:mm", { locale: tr })}
              </span>
            </div>
            <p className="text-sm text-slate-800 whitespace-pre-wrap">{row.message_body}</p>
            {row.status === "failed" && (
              <p className="text-xs text-red-600 mt-2">Gönderilemedi</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
