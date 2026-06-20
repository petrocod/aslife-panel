"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDate, formatCurrency } from "@/lib/utils"
import {
  ArrowLeft,
  Store,
  Users,
  Loader2,
  Save,
  Pencil,
  ChevronUp,
} from "lucide-react"
import { SubscriptionAssignPanel } from "@/components/admin/SubscriptionAssignPanel"

const SERVICE_TYPES = [
  "Sağlık Merkezi",
  "Sağlık Merkezleri",
  "Spor Salonu",
  "Güzellik Merkezi",
  "Fizyoterapi",
  "Diğer",
  "beauty_salon",
]

interface CompanyDetail {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  location: string | null
  authorized: string | null
  founded_at: string | null
  website: string | null
  tc_no: string | null
  tax_number: string | null
  tax_office: string | null
  invoice_address: string | null
  currency: string
  service_type: string | null
  language: string | null
  timezone: string | null
  created_at: string
  organization_id: string | null
}

interface OwnerInfo {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  role: string
}

interface Profile extends OwnerInfo {
  created_at: string
  is_active: boolean
}

interface SubDetail {
  id: string
  plan_id: string
  status: string
  trial_ends_at: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
  subscription_plans: {
    id: string
    name_tr: string
    monthly_price: number | null
    annual_price: number | null
  } | null
}

const PLAN_LABELS: Record<string, string> = {
  asistan: "aSistan",
  asistan_plus: "aSistan Plus",
  asistan_pro: "aSistan Pro",
}

const SUB_STATUS: Record<string, { label: string; variant: "success" | "info" | "destructive" | "secondary" | "warning" }> = {
  active: { label: "Aktif", variant: "success" },
  trialing: { label: "Deneme", variant: "info" },
  past_due: { label: "Gecikmiş", variant: "warning" },
  canceled: { label: "İptal", variant: "destructive" },
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Sahip",
  manager: "Yönetici",
  member: "Üye",
  employee: "Çalışan",
}

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string

  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [owner, setOwner] = useState<OwnerInfo | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [subscription, setSubscription] = useState<SubDetail | null>(null)
  const [stats, setStats] = useState({ users: 0, customers: 0, appointments: 0, revenue: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [form, setForm] = useState<Partial<CompanyDetail>>({})

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const token = await getToken()
      if (!token) { setError("Oturum bulunamadı."); return }

      const res = await fetch(`/api/admin/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Yüklenemedi.")
        setCompany(null)
        return
      }
      setCompany(json.company)
      setForm(json.company)
      setOwner(json.owner || null)
      setProfiles(json.users || [])
      setSubscription(json.subscription || null)
      setStats(json.stats || { users: 0, customers: 0, appointments: 0, revenue: 0 })
    } catch {
      setError("Bağlantı hatası.")
      setCompany(null)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleSave() {
    if (!company) return
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch(`/api/admin/companies/${companyId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, phone: form.phone, email: form.email,
          address: form.address, location: form.location, authorized: form.authorized,
          founded_at: form.founded_at, website: form.website,
          tc_no: form.tc_no, tax_number: form.tax_number, tax_office: form.tax_office,
          invoice_address: form.invoice_address, currency: form.currency,
          service_type: form.service_type, language: form.language, timezone: form.timezone,
        }),
      })
      const json = await res.json()
      if (!res.ok) { alert(json.error || "Kaydedilemedi."); return }
      setCompany(json.company)
      setForm(json.company)
      setEditing(false)
      await fetchAll()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex flex-col items-center py-20 gap-3">
        <p className="text-slate-500">{error || "Şirket bulunamadı"}</p>
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/companies")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Listeye Dön
        </Button>
      </div>
    )
  }

  const planName =
    subscription?.subscription_plans?.name_tr ||
    (subscription ? PLAN_LABELS[subscription.plan_id] || subscription.plan_id : null)

  const subMeta = subscription
    ? SUB_STATUS[subscription.status] || { label: subscription.status, variant: "secondary" as const }
    : null

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header — compact */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => router.push("/admin/companies")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Store className="h-4 w-4 text-blue-600 shrink-0" />
            <h1 className="text-lg font-bold text-slate-900">{company.name}</h1>
            {company.service_type && (
              <span className="text-xs text-slate-500">{company.service_type}</span>
            )}
            {subMeta && (
              <Badge variant={subMeta.variant}>{subMeta.label}</Badge>
            )}
            {planName && (
              <span className="text-xs text-slate-600">{planName}</span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Aktif
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Kayıt: {formatDate(company.created_at, "dd.MM.yyyy")}
            {owner && (
              <> · Sahip: <strong className="text-slate-700">{owner.full_name || "—"}</strong>
              {owner.email && <> ({owner.email})</>}</>
            )}
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => router.push(`/admin/users?companyId=${companyId}`)}>
            <Users className="h-3.5 w-3.5 mr-1" /> Kullanıcıları Yönet
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowEditForm((v) => !v)}>
            {showEditForm ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <Pencil className="h-3.5 w-3.5 mr-1" />}
            {showEditForm ? "Gizle" : "Düzenle"}
          </Button>
        </div>
      </div>

      {/* Ana kart — liste ile aynı bilgiler, tek satırda */}
      <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 text-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-100">
          <Cell label="Kullanıcılar" value={`${stats.users} giriş hesabı`} />
          <Cell
            label="Abonelik"
            value={planName || "—"}
            extra={subMeta ? <Badge variant={subMeta.variant} className="text-[10px] py-0">{subMeta.label}</Badge> : undefined}
          />
          <Cell
            label="Abonelik Başlangıç"
            value={subscription ? formatDate(subscription.created_at, "dd.MM.yyyy") : "—"}
          />
          <Cell
            label={subscription?.status === "trialing" ? "Deneme Bitiş" : "Periyot Sonu"}
            value={
              subscription?.status === "trialing" && subscription.trial_ends_at
                ? formatDate(subscription.trial_ends_at, "dd.MM.yyyy")
                : subscription?.current_period_end
                  ? formatDate(subscription.current_period_end, "dd.MM.yyyy")
                  : "—"
            }
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-3 py-2 bg-white text-xs text-slate-600">
          <span>Müşteri: <b className="text-slate-800">{stats.customers}</b></span>
          <span>Randevu: <b className="text-slate-800">{stats.appointments}</b></span>
          <span>Gelir: <b className="text-slate-800">{formatCurrency(stats.revenue, company.currency)}</b></span>
          <span>Kayıt: <b className="text-slate-800">{formatDate(company.created_at, "dd.MM.yyyy")}</b></span>
        </div>
      </div>

      {/* Kullanıcılar — compact table */}
      <Panel title={`Kullanıcılar (${profiles.length})`}>
        {profiles.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">Kullanıcı yok</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100">
                <th className="text-left py-1.5 font-medium">Ad</th>
                <th className="text-left py-1.5 font-medium">E-posta</th>
                <th className="text-left py-1.5 font-medium">Rol</th>
                <th className="text-left py-1.5 font-medium">Kayıt</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-1.5 font-medium text-slate-800">{p.full_name || "—"}</td>
                  <td className="py-1.5 text-slate-600">{p.email || "—"}</td>
                  <td className="py-1.5 text-slate-600">{ROLE_LABELS[p.role] || p.role}</td>
                  <td className="py-1.5 text-slate-500">{formatDate(p.created_at, "dd.MM.yyyy")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {/* Abonelik — ata / güncelle */}
      <Panel title="Abonelik">
        <SubscriptionAssignPanel
          companyId={companyId}
          companyName={company.name}
          subscription={subscription}
          onSaved={fetchAll}
          compact
        />
      </Panel>

      {/* Düzenleme — collapsible */}
      {showEditForm && (
        <Panel
          title="Şirket Bilgileri"
          action={
            editing ? (
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setForm(company); setEditing(false) }}>İptal</Button>
                <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                  Kaydet
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(true)}>
                <Pencil className="h-3 w-3 mr-1" /> Düzenle
              </Button>
            )
          }
        >
          <div className="grid grid-cols-2 gap-2">
            <F label="Ad" value={editing ? form.name || "" : company.name} edit={editing} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
            <F label="Hizmet" value={editing ? form.service_type || "" : company.service_type || ""} edit={editing} onChange={(v) => setForm((f) => ({ ...f, service_type: v }))} options={SERVICE_TYPES} />
            <F label="Telefon" value={editing ? form.phone || "" : company.phone || ""} edit={editing} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
            <F label="E-posta" value={editing ? form.email || "" : company.email || ""} edit={editing} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
            <F label="Yetkili" value={editing ? form.authorized || "" : company.authorized || ""} edit={editing} onChange={(v) => setForm((f) => ({ ...f, authorized: v }))} />
            <F label="Şehir" value={editing ? form.location || "" : company.location || ""} edit={editing} onChange={(v) => setForm((f) => ({ ...f, location: v }))} />
            <F label="Adres" value={editing ? form.address || "" : company.address || ""} edit={editing} onChange={(v) => setForm((f) => ({ ...f, address: v }))} className="col-span-2" />
            <F label="Vergi No" value={editing ? form.tax_number || "" : company.tax_number || ""} edit={editing} onChange={(v) => setForm((f) => ({ ...f, tax_number: v }))} />
            <F label="Vergi Dairesi" value={editing ? form.tax_office || "" : company.tax_office || ""} edit={editing} onChange={(v) => setForm((f) => ({ ...f, tax_office: v }))} />
          </div>
        </Panel>
      )}
    </div>
  )
}

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/80">
        <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{title}</h2>
        {action}
      </div>
      <div className="px-3 py-2">{children}</div>
    </div>
  )
}

function Cell({ label, value, extra }: { label: string; value: string; extra?: React.ReactNode }) {
  return (
    <div className="bg-white px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <div className="flex items-center gap-1.5 mt-0.5">
        <p className="text-sm font-semibold text-slate-900">{value}</p>
        {extra}
      </div>
    </div>
  )
}

function F({
  label, value, edit, onChange, options, className,
}: {
  label: string; value: string; edit: boolean; onChange: (v: string) => void; options?: string[]; className?: string
}) {
  return (
    <div className={className}>
      <Label className="text-[10px] text-slate-400 uppercase">{label}</Label>
      {edit ? (
        options ? (
          <select className="mt-0.5 w-full h-8 rounded border border-slate-200 px-2 text-xs" value={value} onChange={(e) => onChange(e.target.value)}>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <Input className="mt-0.5 h-8 text-xs" value={value} onChange={(e) => onChange(e.target.value)} />
        )
      ) : (
        <p className="text-xs text-slate-800 mt-0.5 py-1">{value || "—"}</p>
      )}
    </div>
  )
}
