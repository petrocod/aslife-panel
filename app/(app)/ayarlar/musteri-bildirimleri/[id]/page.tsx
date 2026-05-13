"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  buildCompanyPlaceholderOverrides,
  getTemplateById,
  loadEditorState,
  saveEditorState,
  TEMPLATE_VARIABLES,
  type TemplateEditorState,
} from "@/lib/musteri-bildirimleri"
import { loadCompanyBestEffort } from "@/lib/company-db"
import { supabase } from "@/lib/supabase-client"
import { TemplatePreviewProvider, useTemplatePreview } from "@/lib/template-preview-context"
import { useCompany } from "@/hooks/useCompany"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import {
  ArrowLeft,
  CheckCheck,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Monitor,
  Smartphone,
  Stethoscope,
  Tablet,
  Tag,
} from "lucide-react"

const SMS_MAX = 500

type TabId = "email" | "sms" | "whatsapp"
type DeviceId = "mobile" | "tablet" | "desktop"

function deviceMaxClass(d: DeviceId) {
  if (d === "mobile") return "max-w-[320px] mx-auto"
  if (d === "tablet") return "max-w-md mx-auto"
  return "w-full max-w-none"
}

function brandInitialFromCompany(companyName: string): string {
  const t = companyName.trim()
  if (!t) return "İ"
  const cp = t.codePointAt(0)
  if (cp === undefined) return "İ"
  try {
    return String.fromCodePoint(cp).toLocaleUpperCase("tr-TR")
  } catch {
    try {
      return String.fromCodePoint(cp).toUpperCase()
    } catch {
      return "İ"
    }
  }
}

function EmailPreviewBranding() {
  const apply = useTemplatePreview()
  const companyName = apply("{{ $company_company_name }}")
  const logoRaw = apply("{{ $company_logo_url }}").trim()
  const hasLogo = /^https?:\/\//i.test(logoRaw) || logoRaw.startsWith("data:image/")

  return (
    <div className="mb-8 flex items-center gap-3 border-b border-slate-100 pb-6">
      {hasLogo ? (
        // Önizleme: harici logo URL (şablon değişkeni)
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoRaw}
          alt=""
          className="h-10 w-auto max-w-[200px] object-contain object-left"
        />
      ) : (
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-sm font-bold uppercase text-white shadow-sm"
          aria-hidden
        >
          {brandInitialFromCompany(companyName)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold tracking-tight text-slate-900">{companyName}</p>
        <p className="text-xs text-slate-500">Resmi bildirim</p>
      </div>
    </div>
  )
}

function EmailPreviewFooter() {
  const apply = useTemplatePreview()
  const name = apply("{{ $company_company_name }}")
  const phone = apply("{{ $company_fullphone }}")
  const web = apply("{{ $company_website }}")
  const webShort = web.replace(/^https?:\/\//i, "").replace(/\/$/, "")

  return (
    <div className="mt-10 border-t border-slate-100 pt-6">
      <p className="text-center text-[11px] leading-relaxed text-slate-500">
        Bu e-posta{" "}
        <span className="font-medium text-slate-700">{name}</span> tarafından gönderilmiştir.
      </p>
      <p className="mt-2 text-center text-[11px] text-slate-400">
        <span>{phone}</span>
        {webShort ? (
          <>
            <span className="mx-1.5 text-slate-300" aria-hidden>
              ·
            </span>
            <span>{webShort}</span>
          </>
        ) : null}
      </p>
    </div>
  )
}

/** İstemci benzeri çerçeve: başlık şeridi, gönderen/alıcı/konu, gövde kartı */
function EmailPreviewChrome({ subjectLine, children }: { subjectLine: string; children: ReactNode }) {
  const apply = useTemplatePreview()
  const from = apply("{{ $company_email }}")
  const recipient = apply("{{ $customer_name }}")

  return (
    <div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-slate-100 to-slate-200/60 p-2 shadow-sm ring-1 ring-black/5">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/95 px-3 py-2">
          <div className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <span className="flex-1 text-center text-[10px] font-medium uppercase tracking-wider text-slate-400">
            E-posta önizlemesi
          </span>
          <Mail className="h-3.5 w-3.5 text-slate-300" aria-hidden />
        </div>

        <div className="space-y-1.5 border-b border-slate-100 bg-white px-4 py-3 text-left text-[11px] leading-snug">
          <div className="grid grid-cols-[52px_1fr] gap-x-2 gap-y-1">
            <span className="text-slate-400">Gönderen</span>
            <span className="truncate font-medium text-slate-800">{from}</span>
            <span className="text-slate-400">Alıcı</span>
            <span className="truncate text-slate-700">{recipient}</span>
            <span className="text-slate-400">Konu</span>
            <span className="font-semibold text-slate-900">{subjectLine}</span>
          </div>
        </div>

        <div className="bg-[#f4f6f8] px-2 py-3 sm:px-3 sm:py-4">
          <div className="mx-auto max-w-[560px] rounded-lg border border-slate-200/80 bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10">
            <EmailPreviewBranding />
            {children}
            <EmailPreviewFooter />
          </div>
        </div>
      </div>
    </div>
  )
}

function EmailCardPreview({ plain, subjectLine }: { plain: string; subjectLine: string }) {
  const apply = useTemplatePreview()
  const p = apply(plain)
  const lines = p.split("\n").map((l) => l.trimEnd())

  const inner =
    lines.length < 2 ? (
      <div className="whitespace-pre-wrap text-left text-sm leading-relaxed text-slate-600">{p}</div>
    ) : (
      (() => {
        const [head, title, ...rest] = lines
        const bodyText = rest.join("\n").trim()
        return (
          <div className="text-left text-slate-800">
            <p className="text-sm text-slate-600">
              Merhaba <span className="font-semibold text-slate-900">{head}</span>,
            </p>
            <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
            {bodyText ? (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{bodyText}</p>
            ) : null}
          </div>
        )
      })()
    )

  return <EmailPreviewChrome subjectLine={subjectLine}>{inner}</EmailPreviewChrome>
}

/** Katılım e-postası: metin = başlık (ilk paragraf) + gövde; bilgi alanları değişkenlerden. */
function ParticipationEmailPreview({ raw }: { raw: string }) {
  const apply = useTemplatePreview()
  const p = apply(raw.trim())
  const parts = p.split(/\n\n+/)
  const headline = (parts[0] ?? "").trim() || "Katılım durumunu bildirir misin?"
  const body = parts.length > 1 ? parts.slice(1).join("\n\n").trim() : ""
  const service = apply("{{ $service_title }}")
  const dateLine = `${apply("{{ $appointment_starting_at_time }}")} - ${apply("{{ $appointment_starting_at_date }}")}`
  const loc = apply("{{ $company_address }}")

  const guest = apply("{{ $customer_name }}")

  const inner = (
    <div className="text-slate-800">
      <p className="text-sm text-slate-600">
        Merhaba <span className="font-semibold text-slate-900">{guest}</span>,
      </p>
      <h2 className="mt-5 text-center text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{headline}</h2>
      {body && <p className="mt-3 text-center text-sm text-slate-600 whitespace-pre-wrap">{body}</p>}

      <div className="mt-6 space-y-2 text-left">
        <InfoRow
          icon={Stethoscope}
          label="Hizmet adı"
          value={service}
        />
        <InfoRow
          icon={Clock}
          label="Randevu saati ve tarihi"
          value={dateLine}
        />
        <InfoRow
          icon={MapPin}
          label="Konum"
          value={loc}
        />
      </div>

      <div className="mt-6 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center sm:justify-center">
        <Button
          type="button"
          className="h-10 rounded-md bg-[#0ea5e9] px-4 text-sm font-medium text-white hover:bg-sky-600"
        >
          Katılacağım
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-md border-[#0ea5e9] bg-white px-4 text-sm font-medium text-[#0ea5e9] hover:bg-sky-50"
        >
          Katılmayacağım
        </Button>
      </div>
    </div>
  )

  return <EmailPreviewChrome subjectLine="Randevu Katılımı">{inner}</EmailPreviewChrome>
}

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-100/80 p-3 text-left text-sm">
      <Icon className="h-4 w-4 shrink-0 text-sky-500" aria-hidden />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="font-medium text-slate-800">{value}</p>
      </div>
    </div>
  )
}

function SmsPreviewBubble({ text }: { text: string }) {
  const apply = useTemplatePreview()
  const t = apply(text)
  return (
    <div className="flex justify-end">
      <div className="max-w-[90%] rounded-2xl rounded-tr-sm bg-slate-200 px-3.5 py-2.5 text-left text-sm text-slate-800 shadow-sm">
        <p className="whitespace-pre-wrap break-words">{t}</p>
      </div>
    </div>
  )
}

function WhatsappPreviewBubble({
  text,
  enabled,
  showTime,
  variant = "default",
}: {
  text: string
  enabled: boolean
  showTime: boolean
  variant?: "default" | "attendance"
}) {
  const apply = useTemplatePreview()
  const t = apply(text)
  return (
    <div
      className="rounded-2xl p-3"
      style={{ background: "linear-gradient(180deg, #d9fdd3 0%, #e5ddd5 12%)" }}
    >
      {enabled && (
        <div className="mb-2 flex flex-col items-center text-slate-500">
          <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-full border border-slate-300/80 bg-white">
            <MessageCircle className="h-4 w-4" />
          </div>
        </div>
      )}
      <div className="flex justify-end">
        <div
          className="relative max-w-[95%] rounded-lg bg-white px-2.5 py-1.5 pl-2 pr-1 text-left shadow"
          style={{ boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)" }}
        >
          {t.split("\n").map((line, i) => {
            const trimmed = line.trim()
            if (!trimmed) return null
            if (trimmed.startsWith("_") && trimmed.endsWith("_") && trimmed.length > 2) {
              return (
                <p
                  key={i}
                  className={cn("whitespace-pre-wrap break-words text-xs italic text-slate-500", i > 0 && "mt-1")}
                >
                  {trimmed.slice(1, -1).trim()}
                </p>
              )
            }
            const parts = trimmed.split(/(\*[^*]+\*)/g)
            return (
              <p key={i} className={cn("whitespace-pre-wrap break-words text-sm text-slate-800", i > 0 && "mt-1")}>
                {parts.map((part, j) => {
                  if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
                    return (
                      <strong key={j} className="font-semibold text-slate-900">
                        {part.slice(1, -1)}
                      </strong>
                    )
                  }
                  return <span key={j}>{part}</span>
                })}
              </p>
            )
          })}
          {showTime && (
            <div className="mt-1 flex items-end justify-end gap-0.5 pr-0.5 text-[10px] text-slate-400">
              <span>14:55</span>
              <CheckCheck className="h-3.5 w-3.5 text-sky-500" aria-hidden />
            </div>
          )}
          {variant === "attendance" && (
            <div className="mt-2 space-y-0.5 border-t border-slate-100 pt-1.5">
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="flex items-center justify-center gap-1.5 rounded border border-slate-200 bg-slate-50/90 py-1.5 text-center text-sm font-medium text-sky-600 no-underline hover:bg-slate-100"
              >
                Katılacağım
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="flex items-center justify-center gap-1.5 rounded border border-slate-200 bg-slate-50/90 py-1.5 text-center text-sm font-medium text-sky-600 no-underline hover:bg-slate-100"
              >
                Katılmayacağım
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EmailSenderMeta() {
  const apply = useTemplatePreview()
  return <p className="text-xs text-slate-500">gönderen: {apply("{{ $company_email }}")}</p>
}

export default function MusteriBildirimEditPage() {
  const params = useParams()
  const router = useRouter()
  const template = getTemplateById(params?.id)
  const { companyId, loading: companyAuthLoading } = useCompany()
  const [companyRow, setCompanyRow] = useState<Record<string, unknown> | null>(null)

  const previewOverrides = useMemo(() => buildCompanyPlaceholderOverrides(companyRow), [companyRow])

  useEffect(() => {
    if (companyAuthLoading || !companyId) {
      if (!companyAuthLoading && !companyId) setCompanyRow(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const { data } = await loadCompanyBestEffort(supabase, companyId)
        if (!cancelled) setCompanyRow(data)
      } catch {
        if (!cancelled) setCompanyRow(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [companyId, companyAuthLoading])

  const [tab, setTab] = useState<TabId>("email")
  const [device, setDevice] = useState<DeviceId>("desktop")
  const [state, setState] = useState<TemplateEditorState | null>(null)
  const [savedHint, setSavedHint] = useState(false)
  const [waShowPreview, setWaShowPreview] = useState(true)

  const emailRef = useRef<HTMLTextAreaElement>(null)
  const smsRef = useRef<HTMLTextAreaElement>(null)
  const waRef = useRef<HTMLTextAreaElement>(null)

  const insertVariable = (key: string) => {
    setState((s) => {
      if (!s) return s
      const ref = tab === "email" ? emailRef : tab === "sms" ? smsRef : waRef
      const field = tab === "email" ? "email" : tab === "sms" ? "sms" : "whatsapp"
      const cur = typeof s[field] === "string" ? s[field] : ""
      const el = ref.current
      if (el) {
        const a = el.selectionStart ?? 0
        const b = el.selectionEnd ?? 0
        const next = cur.slice(0, a) + key + cur.slice(b)
        requestAnimationFrame(() => {
          const pos = a + key.length
          el.focus()
          el.setSelectionRange(pos, pos)
        })
        return { ...s, [field]: next } as TemplateEditorState
      }
      return { ...s, [field]: cur + key } as TemplateEditorState
    })
  }

  useEffect(() => {
    if (!template) {
      setState(null)
      return
    }
    setState(loadEditorState(template))
  }, [template])

  if (!template) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Bildirim bulunamadı.</p>
        <Button variant="link" className="px-0" onClick={() => router.push("/ayarlar/musteri-bildirimleri")}>
          Listeye dön
        </Button>
      </div>
    )
  }

  if (!state) {
    return <div className="p-6 text-sm text-slate-500">Yükleniyor…</div>
  }

  const lenSms = state.sms.length
  const onSave = () => {
    saveEditorState(template, state)
    setSavedHint(true)
    setTimeout(() => setSavedHint(false), 2000)
  }

  return (
    <TemplatePreviewProvider overrides={previewOverrides}>
    <div className="min-h-full bg-slate-50 w-full max-w-none">
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
        <nav className="text-sm text-slate-500 flex flex-wrap items-center gap-1.5" aria-label="Breadcrumb">
          <Link href="/ayarlar" className="hover:text-blue-600">
            Ayarlar
          </Link>
          <span>/</span>
          <Link href="/ayarlar/musteri-bildirimleri" className="hover:text-blue-600">
            Müşteri Bildirimleri
          </Link>
          <span>/</span>
          <span className="text-slate-800">{template.title}</span>
        </nav>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{template.title}</h1>
            <p className="text-sm text-slate-500 mt-1">Tüm bildirimlerinizi buradan açık kapatabilir ve düzenleyebilirsiniz.</p>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => router.push("/ayarlar/musteri-bildirimleri")}>
            <ArrowLeft className="h-4 w-4" />
            Geri
          </Button>
        </div>
      </div>

      <div className="w-full max-w-none px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="w-full max-w-none">
          <TabsList
            className="h-11 w-full justify-start gap-0 rounded-none border-0 border-b border-slate-200 bg-transparent p-0"
          >
            {[
              { id: "email" as const, label: "e-Mail", icon: Mail },
              { id: "sms" as const, label: "SMS", icon: MessageSquare },
              { id: "whatsapp" as const, label: "Whatsapp", icon: MessageCircle },
            ].map(({ id: tid, label, icon: Icon }) => (
              <TabsTrigger
                key={tid}
                value={tid}
                className="rounded-none border-0 border-b-2 border-transparent bg-transparent px-4 py-2.5 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
              >
                <Icon className="mr-1.5 h-4 w-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="email" className="mt-6">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start xl:gap-10 w-full max-w-none">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">E-posta İçeriği</Label>
                  <VarDropdown onPick={insertVariable} />
                </div>
                <Textarea
                  ref={emailRef}
                  value={state.email}
                  onChange={(e) => setState({ ...state, email: e.target.value })}
                  className="min-h-[280px] font-mono text-sm"
                />
                <p className="text-xs text-slate-500">Mesajınızı kişiselleştirmek için değişkenler kullanın.</p>
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
                      <Mail className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{template.title}</p>
                      <EmailSenderMeta />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Aktif</span>
                    <Switch checked={state.emailEnabled} onCheckedChange={(c) => setState({ ...state, emailEnabled: c })} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  {(
                    [
                      ["mobile", Smartphone],
                      ["tablet", Tablet],
                      ["desktop", Monitor],
                    ] as const
                  ).map(([d, Icon]) => (
                    <Button
                      key={d}
                      type="button"
                      variant={device === d ? "default" : "outline"}
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setDevice(d)}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  ))}
                </div>
                <div
                  className={cn(
                    deviceMaxClass(device),
                    "max-h-[min(520px,70vh)] overflow-y-auto overflow-x-hidden overscroll-y-contain rounded-xl pb-1 pr-1 [scrollbar-gutter:stable]"
                  )}
                >
                  {template.emailPreviewLayout === "participation" ? (
                    <ParticipationEmailPreview raw={state.email} />
                  ) : (
                    <EmailCardPreview plain={state.email} subjectLine={template.title} />
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sms" className="mt-6">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-10 w-full max-w-none">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">SMS İçeriği</Label>
                  <VarDropdown onPick={insertVariable} />
                </div>
                <Textarea
                  ref={smsRef}
                  value={state.sms}
                  onChange={(e) => setState({ ...state, sms: e.target.value })}
                  className={cn("min-h-[280px] font-mono text-sm", lenSms > SMS_MAX && "border-red-300")}
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Mesajınızı kişiselleştirmek için değişkenler kullanın</span>
                  <span className={lenSms > SMS_MAX ? "font-medium text-red-600" : ""}>
                    {lenSms}/{SMS_MAX}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-xs text-slate-500">Aktif</span>
                  <Switch checked={state.smsEnabled} onCheckedChange={(c) => setState({ ...state, smsEnabled: c })} />
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-100/80 p-4">
                  <div className="mb-2 flex flex-col items-center text-slate-500">
                    <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white">
                      <SmsUserAvatar />
                    </div>
                  </div>
                  <SmsPreviewBubble text={state.sms} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="whatsapp" className="mt-6">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-10 w-full max-w-none">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">WhatsApp İçeriği</Label>
                  <VarDropdown onPick={insertVariable} />
                </div>
                <Textarea
                  ref={waRef}
                  value={state.whatsapp}
                  onChange={(e) => setState({ ...state, whatsapp: e.target.value })}
                  className="min-h-[280px] font-mono text-sm"
                />
                <p className="text-xs text-slate-500">Değişkenler önizlemede doldurulur.</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Önizleme</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">Aktif</span>
                    <Switch checked={state.whatsappEnabled} onCheckedChange={(c) => setState({ ...state, whatsappEnabled: c })} />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Label className="text-xs text-slate-500">Önizleme göster</Label>
                  <Switch checked={waShowPreview} onCheckedChange={setWaShowPreview} />
                </div>
                {waShowPreview && (
                  <WhatsappPreviewBubble
                    text={state.whatsapp}
                    enabled={state.whatsappEnabled}
                    showTime
                    variant={template.whatsappPreview === "attendance" ? "attendance" : "default"}
                  />
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
          {savedHint && <span className="text-sm text-emerald-600">Kaydedildi</span>}
          <Button type="button" variant="ghost" onClick={() => router.push("/ayarlar/musteri-bildirimleri")}>
            Vazgeç
          </Button>
          <Button type="button" onClick={onSave} disabled={lenSms > SMS_MAX}>
            Kaydet
          </Button>
        </div>
      </div>
    </div>
    </TemplatePreviewProvider>
  )
}

function SmsUserAvatar() {
  return <div className="h-6 w-6 rounded-full border border-slate-300 bg-slate-200" role="img" aria-label="Kullanıcı" />
}

function VarDropdown({ onPick }: { onPick: (key: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs">
          <Tag className="h-3.5 w-3.5" />
          Değişken Ekle
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-h-72 overflow-y-auto">
        <DropdownMenuLabel className="text-xs uppercase text-slate-500">Genel değişkenler</DropdownMenuLabel>
        {TEMPLATE_VARIABLES.map((v) => (
          <DropdownMenuItem
            key={v.key}
            onClick={() => onPick(v.key)}
            className="flex flex-col items-start gap-0.5"
          >
            <span className="text-sm">{v.label}</span>
            <span className="font-mono text-[10px] text-slate-400">{v.key}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
