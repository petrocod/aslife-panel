"use client"

import { useEffect, useState, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Send,
  Loader2,
  User,
  Headphones,
  AlertCircle,
} from "lucide-react"
import { SUPPORT_REPLY_TEMPLATES, getSlaStatus } from "@/lib/support-sla"

type Message = {
  id: string
  sender_type: "user" | "support"
  sender_id: string | null
  message: string
  created_at: string
}

type TicketDetail = {
  id: string
  subject: string
  status: string
  priority: string
  company_name: string
  user_name: string
  user_email: string
  created_at: string
  updated_at: string
  sla_due_at: string | null
  first_response_at: string | null
  messages: Message[]
}

const PRIORITY_MAP: Record<string, { label: string; class: string }> = {
  urgent: { label: "Acil", class: "bg-red-100 text-red-700 border-red-200" },
  high: { label: "Yüksek", class: "bg-orange-100 text-orange-700 border-orange-200" },
  normal: { label: "Normal", class: "bg-blue-100 text-blue-700 border-blue-200" },
  low: { label: "Düşük", class: "bg-slate-100 text-slate-600 border-slate-200" },
}

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  open: { label: "Açık", class: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress: { label: "Devam Eden", class: "bg-amber-100 text-amber-700 border-amber-200" },
  resolved: { label: "Çözüldü", class: "bg-green-100 text-green-700 border-green-200" },
  closed: { label: "Kapalı", class: "bg-slate-100 text-slate-600 border-slate-200" },
}

export default function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const [updating, setUpdating] = useState(false)

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ""
  }, [])

  const fetchTicket = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch(`/api/admin/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Fetch failed")
      setTicket(await res.json())
    } catch {
      setTicket(null)
    } finally {
      setLoading(false)
    }
  }, [id, getToken])

  useEffect(() => { fetchTicket() }, [fetchTicket])

  async function handleSendReply() {
    if (!reply.trim() || sending) return
    setSending(true)
    try {
      const token = await getToken()
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply.trim() }),
      })
      if (res.ok) { setReply(""); await fetchTicket() }
    } finally { setSending(false) }
  }

  async function handleUpdate(field: string, value: string) {
    setUpdating(true)
    try {
      const token = await getToken()
      await fetch(`/api/admin/tickets/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      await fetchTicket()
    } finally { setUpdating(false) }
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString("tr-TR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    } catch { return iso }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <AlertCircle className="h-10 w-10 mb-3" />
        <p className="text-sm">Talep bulunamadı.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push("/admin/tickets")}>
          Geri Dön
        </Button>
      </div>
    )
  }

  const prio = PRIORITY_MAP[ticket.priority] || PRIORITY_MAP.normal
  const stat = STATUS_MAP[ticket.status] || STATUS_MAP.open
  const sla = getSlaStatus(ticket.sla_due_at, ticket.status)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/tickets")} className="text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4 mr-1" /> Geri
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-slate-900">{ticket.subject}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {ticket.company_name} — {ticket.user_name} ({ticket.user_email})
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Oluşturulma: {formatDate(ticket.created_at)} | Güncelleme: {formatDate(ticket.updated_at)}
            </p>
            {ticket.sla_due_at && (
              <p
                className={cn(
                  "text-xs mt-1 font-medium",
                  sla === "breached" && "text-red-600",
                  sla === "warning" && "text-amber-600",
                  sla === "ok" && "text-emerald-600"
                )}
              >
                SLA son tarih: {formatDate(ticket.sla_due_at)}
                {sla === "breached" && " — gecikmiş"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn("text-[10px] border", prio.class)}>{prio.label}</Badge>
            <Badge className={cn("text-[10px] border", stat.class)}>{stat.label}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Durum:</span>
            <Select value={ticket.status} onValueChange={(v) => handleUpdate("status", v)} disabled={updating}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Açık</SelectItem>
                <SelectItem value="in_progress">Devam Eden</SelectItem>
                <SelectItem value="resolved">Çözüldü</SelectItem>
                <SelectItem value="closed">Kapalı</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Öncelik:</span>
            <Select value={ticket.priority} onValueChange={(v) => handleUpdate("priority", v)} disabled={updating}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">Acil</SelectItem>
                <SelectItem value="high">Yüksek</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Düşük</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-slate-700 mb-4">Mesajlar ({ticket.messages.length})</h2>

        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {ticket.messages.map((msg) => {
            const isSupport = msg.sender_type === "support"
            return (
              <div key={msg.id} className={cn("flex", isSupport ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[75%] rounded-xl px-4 py-3 space-y-1",
                  isSupport ? "bg-orange-50 border border-orange-200" : "bg-slate-50 border border-slate-200"
                )}>
                  <div className="flex items-center gap-1.5">
                    {isSupport ? <Headphones className="h-3 w-3 text-orange-500" /> : <User className="h-3 w-3 text-slate-400" />}
                    <span className={cn("text-[10px] font-medium", isSupport ? "text-orange-600" : "text-slate-500")}>
                      {isSupport ? "Destek" : "Kullanıcı"}
                    </span>
                    <span className="text-[10px] text-slate-400">{formatDate(msg.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{msg.message}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-wrap gap-2">
            {SUPPORT_REPLY_TEMPLATES.map((t) => (
              <Button
                key={t.id}
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => setReply(t.body)}
              >
                {t.label}
              </Button>
            ))}
          </div>
          <Textarea
            placeholder="Yanıtınızı yazın..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            className="resize-none"
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSendReply() }}
          />
          <div className="flex justify-end">
            <Button onClick={handleSendReply} disabled={!reply.trim() || sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Yanıtla
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
