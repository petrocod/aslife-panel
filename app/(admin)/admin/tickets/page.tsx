"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Search,
  MessageSquare,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
} from "lucide-react"

type Ticket = {
  id: string
  subject: string
  status: string
  priority: string
  created_at: string
  company_name: string
  user_name: string
  message_count: number
}

const STATUS_TABS = [
  { value: "all", label: "Tümü" },
  { value: "open", label: "Açık" },
  { value: "in_progress", label: "Devam Eden" },
  { value: "resolved", label: "Çözüldü" },
  { value: "closed", label: "Kapalı" },
]

const PRIORITY_MAP: Record<string, { label: string; class: string }> = {
  urgent: { label: "Acil", class: "bg-red-100 text-red-700 border-red-200" },
  high: { label: "Yüksek", class: "bg-orange-100 text-orange-700 border-orange-200" },
  normal: { label: "Normal", class: "bg-blue-100 text-blue-700 border-blue-200" },
  low: { label: "Düşük", class: "bg-slate-100 text-slate-600 border-slate-200" },
}

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  open: { label: "Açık", class: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress: { label: "Devam Eden", class: "bg-amber-100 text-amber-700 border-amber-200" },
  resolved: { label: "Çözüldü", class: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  closed: { label: "Kapalı", class: "bg-slate-100 text-slate-600 border-slate-200" },
}

export default function AdminTicketsPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [priority, setPriority] = useState("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      const params = new URLSearchParams()
      if (activeTab !== "all") params.set("status", activeTab)
      if (priority !== "all") params.set("priority", priority)
      if (search.trim()) params.set("search", search.trim())
      params.set("page", String(page))
      params.set("limit", "20")

      const res = await fetch(`/api/admin/tickets?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error("Fetch failed")

      const json = await res.json()
      setTickets(json.tickets || [])
      setTotalPages(json.totalPages || 1)
      setTotal(json.total || 0)
    } catch {
      setTickets([])
    } finally {
      setLoading(false)
    }
  }, [activeTab, priority, search, page])

  useEffect(() => {
    const timer = setTimeout(fetchTickets, search ? 400 : 0)
    return () => clearTimeout(timer)
  }, [fetchTickets, search])

  useEffect(() => {
    setPage(1)
  }, [activeTab, priority, search])

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return iso
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Destek Talepleri</h1>
        <p className="text-slate-500 text-sm mt-1">
          Tüm şirketlerden gelen destek taleplerini yönetin. Toplam {total}{" "}
          talep.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Konu ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-slate-200"
          />
        </div>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-[160px] border-slate-200">
            <SelectValue placeholder="Öncelik" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Öncelikler</SelectItem>
            <SelectItem value="urgent">Acil</SelectItem>
            <SelectItem value="high">Yüksek</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Düşük</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 border border-slate-200">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-500"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <AlertCircle className="h-10 w-10 mb-3" />
                <p className="text-sm">Destek talebi bulunamadı.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tickets.map((ticket) => {
                  const prio =
                    PRIORITY_MAP[ticket.priority] || PRIORITY_MAP.normal
                  const stat = STATUS_MAP[ticket.status] || STATUS_MAP.open
                  return (
                    <button
                      key={ticket.id}
                      onClick={() =>
                        router.push(`/admin/tickets/${ticket.id}`)
                      }
                      className={cn(
                        "w-full text-left rounded-xl border border-slate-200 bg-white",
                        "p-4 hover:bg-slate-50 transition-colors"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-slate-900 truncate">
                            {ticket.subject}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            {ticket.company_name} — {ticket.user_name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            className={cn("text-[10px] border", prio.class)}
                          >
                            {prio.label}
                          </Badge>
                          <Badge
                            className={cn("text-[10px] border", stat.class)}
                          >
                            {stat.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {ticket.message_count} mesaj
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(ticket.created_at)}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="border-slate-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-slate-500">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="border-slate-200"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
