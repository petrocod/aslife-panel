"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase-client"
import { useCompany } from "@/hooks/useCompany"
import {
  Plus,
  Send,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react"
import { computeSlaDueAt, SUPPORT_SLA_HOURS } from "@/lib/support-sla"

type Ticket = {
  id: string
  subject: string
  status: string
  priority: string
  created_at: string
  updated_at: string
}

type Message = {
  id: string
  sender_type: string
  message: string
  created_at: string
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: "Açık", color: "bg-blue-100 text-blue-700", icon: AlertCircle },
  in_progress: { label: "İşlemde", color: "bg-amber-100 text-amber-700", icon: Clock },
  resolved: { label: "Çözüldü", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  closed: { label: "Kapatıldı", color: "bg-slate-100 text-slate-600", icon: CheckCircle2 },
}

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: "Düşük", color: "bg-slate-100 text-slate-600" },
  normal: { label: "Normal", color: "bg-blue-100 text-blue-600" },
  high: { label: "Yüksek", color: "bg-orange-100 text-orange-700" },
  urgent: { label: "Acil", color: "bg-red-100 text-red-700" },
}

export default function DestekPage() {
  const { companyId } = useCompany()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [msgLoading, setMsgLoading] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [tab, setTab] = useState("tickets")

  // New ticket form
  const [subject, setSubject] = useState("")
  const [priority, setPriority] = useState("normal")
  const [firstMessage, setFirstMessage] = useState("")
  const [creating, setCreating] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (companyId) loadTickets()
  }, [companyId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadTickets() {
    setLoading(true)
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("company_id", companyId!)
      .order("updated_at", { ascending: false })
    setTickets(data || [])
    setLoading(false)
  }

  async function loadMessages(ticketId: string) {
    setMsgLoading(true)
    const { data } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true })
    setMessages(data || [])
    setMsgLoading(false)
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
  }

  async function handleSelectTicket(ticket: Ticket) {
    setSelectedTicket(ticket)
    await loadMessages(ticket.id)
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !selectedTicket) return
    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("ticket_messages").insert({
      ticket_id: selectedTicket.id,
      sender_type: "user",
      sender_id: user?.id,
      message: newMessage.trim(),
    })
    await supabase
      .from("support_tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", selectedTicket.id)
    setNewMessage("")
    await loadMessages(selectedTicket.id)
    setSending(false)
  }

  async function handleCreateTicket() {
    if (!subject.trim() || !firstMessage.trim() || !companyId) return
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()

    const now = new Date().toISOString()
    const { data: ticket } = await supabase
      .from("support_tickets")
      .insert({
        company_id: companyId,
        user_id: user?.id,
        subject: subject.trim(),
        priority,
        sla_due_at: computeSlaDueAt(now),
      })
      .select()
      .single()

    if (ticket) {
      await supabase.from("ticket_messages").insert({
        ticket_id: ticket.id,
        sender_type: "user",
        sender_id: user?.id,
        message: firstMessage.trim(),
      })
      // Send email notification to admin (fire-and-forget)
      fetch("/api/support/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), priority, companyName: "", userName: user?.email }),
      }).catch(() => {})
      setSubject("")
      setFirstMessage("")
      setPriority("normal")
      setTab("tickets")
      await loadTickets()
      handleSelectTicket(ticket)
    }
    setCreating(false)
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("tr-TR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    })
  }

  if (selectedTicket) {
    const statusInfo = STATUS_MAP[selectedTicket.status] || STATUS_MAP.open
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Geri
        </Button>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{selectedTicket.subject}</CardTitle>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Oluşturulma: {formatDate(selectedTicket.created_at)}
            </p>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg h-[400px] flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">Henüz mesaj yok.</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 text-sm ${
                          msg.sender_type === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        <p>{msg.message}</p>
                        <p className={`text-[10px] mt-1 ${msg.sender_type === "user" ? "text-blue-200" : "text-slate-400"}`}>
                          {formatDate(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {selectedTicket.status !== "closed" && (
                <div className="border-t p-3 flex gap-2">
                  <Input
                    placeholder="Mesajınızı yazın..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  />
                  <Button size="icon" onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Destek</h1>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="tickets">
            <MessageSquare className="w-4 h-4 mr-1" /> Taleplerim
          </TabsTrigger>
          <TabsTrigger value="new">
            <Plus className="w-4 h-4 mr-1" /> Yeni Talep
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : tickets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Henüz destek talebiniz bulunmuyor.</p>
                <Button className="mt-4" onClick={() => setTab("new")}>
                  <Plus className="w-4 h-4 mr-1" /> Yeni Talep Oluştur
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => {
                const statusInfo = STATUS_MAP[t.status] || STATUS_MAP.open
                const priorityInfo = PRIORITY_MAP[t.priority] || PRIORITY_MAP.normal
                return (
                  <Card
                    key={t.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleSelectTicket(t)}
                  >
                    <CardContent className="py-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{t.subject}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(t.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${priorityInfo.color}`}>
                          {priorityInfo.label}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Yeni Destek Talebi</CardTitle>
              <p className="text-xs text-blue-700 mt-2">
                İlk yanıt hedefi: {SUPPORT_SLA_HOURS} saat (iş günü içi).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Konu</label>
                <Input
                  placeholder="Sorununuzu kısaca özetleyin"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Öncelik</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Düşük</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Yüksek</SelectItem>
                    <SelectItem value="urgent">Acil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Mesaj</label>
                <Textarea
                  placeholder="Sorununuzu detaylı olarak açıklayın..."
                  rows={5}
                  value={firstMessage}
                  onChange={(e) => setFirstMessage(e.target.value)}
                />
              </div>
              <Button
                onClick={handleCreateTicket}
                disabled={creating || !subject.trim() || !firstMessage.trim()}
                className="w-full"
              >
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {creating ? "Gönderiliyor..." : "Talebi Gönder"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
