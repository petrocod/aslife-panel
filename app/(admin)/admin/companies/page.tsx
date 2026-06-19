"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn, formatDate } from "@/lib/utils"
import {
  Search,
  Store,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  MoreHorizontal,
  ExternalLink,
  LogIn,
  CreditCard,
  Users,
  Plus,
  Copy,
  CheckCircle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface Company {
  id: string
  name: string
  phone: string
  email: string
  currency: string
  service_type: string
  is_active?: boolean
  created_at: string
  organization_id: string
  organization: { id: string; name: string; slug: string } | null
  owner: { id: string; full_name: string } | null
  customers_count: number
  subscription: {
    plan_id: string
    status: string
    trial_ends_at: string | null
  } | null
}

interface CreateResult {
  companyId: string
  ownerTempPassword?: string
  ownerEmail?: string
}

interface ApiResponse {
  companies: Company[]
  total: number
  page: number
  limit: number
  totalPages: number
}

function PlanBadge({ sub }: { sub: Company["subscription"] }) {
  if (!sub)
    return (
      <Badge variant="outline" className="border-slate-200 text-slate-400">
        Yok
      </Badge>
    )

  const statusMap: Record<
    string,
    {
      label: string
      variant: "success" | "warning" | "info" | "destructive" | "secondary"
    }
  > = {
    active: { label: "Aktif", variant: "success" },
    trialing: { label: "Deneme", variant: "info" },
    past_due: { label: "Gecikmiş", variant: "warning" },
    canceled: { label: "İptal", variant: "destructive" },
    unpaid: { label: "Ödenmedi", variant: "destructive" },
  }

  const planLabels: Record<string, string> = {
    asistan: "aSistan",
    asistan_plus: "aSistan Plus",
    asistan_pro: "aSistan Pro",
  }

  const s = statusMap[sub.status] || {
    label: sub.status,
    variant: "secondary" as const,
  }
  return (
    <div className="flex items-center gap-1.5">
      <Badge variant={s.variant}>{s.label}</Badge>
      <span className="text-xs text-slate-500">
        {planLabels[sub.plan_id] || sub.plan_id}
      </span>
    </div>
  )
}

export default function AdminCompaniesPage() {
  const router = useRouter()
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")
  const [createResult, setCreateResult] = useState<CreateResult | null>(null)
  const [formName, setFormName] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formServiceType, setFormServiceType] = useState("beauty_salon")
  const [formOwnerEmail, setFormOwnerEmail] = useState("")
  const [formOwnerName, setFormOwnerName] = useState("")
  const [formOwnerPhone, setFormOwnerPhone] = useState("")
  const limit = 20

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })
      if (debouncedSearch) params.set("search", debouncedSearch)

      const res = await fetch(`/api/admin/companies?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        setData(await res.json())
      }
    } catch {
      /* silently fail */
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function resetCreateForm() {
    setFormName("")
    setFormPhone("")
    setFormEmail("")
    setFormServiceType("beauty_salon")
    setFormOwnerEmail("")
    setFormOwnerName("")
    setFormOwnerPhone("")
    setCreateError("")
    setCreateResult(null)
  }

  async function handleCreateTenant() {
    if (!formName.trim()) {
      setCreateError("Müşteri adı zorunludur.")
      return
    }
    setCreating(true)
    setCreateError("")
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: formName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim(),
          service_type: formServiceType.trim() || "beauty_salon",
          owner_email: formOwnerEmail.trim() || undefined,
          owner_full_name: formOwnerName.trim() || undefined,
          owner_phone: formOwnerPhone.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setCreateError(json.error || "Oluşturulamadı.")
        return
      }
      setCreateResult({
        companyId: json.company?.id,
        ownerTempPassword: json.ownerTempPassword,
        ownerEmail: formOwnerEmail.trim() || undefined,
      })
      await fetchData()
    } finally {
      setCreating(false)
    }
  }

  function handleLoginAs(companyId: string) {
    alert(`Login as company: ${companyId} — Bu özellik henüz aktif değil.`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Müşteriler</h1>
          <p className="text-sm text-slate-500 mt-1">
            Müşteri hesaplarını ve giriş kullanıcılarını yönetin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => { resetCreateForm(); setCreateOpen(true) }} className="gap-1">
            <Plus className="h-4 w-4" /> Yeni Müşteri
          </Button>
          <Button
          variant="ghost"
          size="sm"
          onClick={fetchData}
          className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
        >
          <RefreshCw
            className={cn("h-4 w-4 mr-2", loading && "animate-spin")}
          />
          Yenile
        </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Şirket adı, telefon veya email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 border-slate-200"
          />
        </div>
        {data && (
          <span className="text-sm text-slate-500">
            Toplam {data.total} müşteri
          </span>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Müşteri
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Sahip / Giriş
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Müşteri Sayısı
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Abonelik Planı
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Kayıt Tarihi
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  İşlem
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" />
                    <p className="text-sm text-slate-500 mt-2">
                      Yükleniyor...
                    </p>
                  </td>
                </tr>
              ) : !data?.companies?.length ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Store className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="text-sm text-slate-500 mt-2">
                      Şirket bulunamadı
                    </p>
                  </td>
                </tr>
              ) : (
                data.companies.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                          <Store className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <button
                            onClick={() =>
                              router.push(`/admin/companies/${c.id}`)
                            }
                            className="font-medium text-slate-900 hover:text-violet-600 transition-colors text-left"
                          >
                            {c.name}
                          </button>
                          {c.service_type && (
                            <p className="text-xs text-slate-500">
                              {c.service_type}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div>{c.owner?.full_name || "—"}</div>
                      {c.email && (
                        <p className="text-xs text-slate-500">{c.email}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1 text-slate-700">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {c.customers_count}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <PlanBadge sub={c.subscription} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      {(c.is_active ?? true) ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-xs text-emerald-700">
                            Aktif
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          <span className="text-xs text-red-700">Pasif</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/admin/companies/${c.id}`)
                            }
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Detay
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleLoginAs(c.id)}
                          >
                            <LogIn className="h-4 w-4 mr-2" />
                            Olarak Giriş Yap
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/admin/users?companyId=${c.id}`)
                            }
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Kullanıcılar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/admin/companies/${c.id}#subscription`
                              )
                            }
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Plan Değiştir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Sayfa {data.page} / {data.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Önceki
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                Sonraki
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetCreateForm()
            setCreateOpen(false)
          } else {
            setCreateOpen(true)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Müşteri</DialogTitle>
            <DialogDescription>
              Müşteri kaydı ve isteğe bağlı ilk giriş kullanıcısı oluşturulur. Kullanıcı şifresini
              profilinden veya &quot;Şifremi Unuttum&quot; ile değiştirir.
            </DialogDescription>
          </DialogHeader>

          {createResult ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                <CheckCircle className="h-5 w-5 shrink-0" />
                Müşteri oluşturuldu.
              </div>
              {createResult.ownerEmail && createResult.ownerTempPassword && (
                <div className="bg-slate-50 border rounded-lg p-4 space-y-2 text-sm">
                  <p className="font-medium text-slate-800">Giriş bilgileri (müşteriye gönderin)</p>
                  <p>
                    <span className="text-slate-500">E-posta:</span>{" "}
                    <span className="font-mono">{createResult.ownerEmail}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-slate-500">Geçici şifre:</span>
                    <span className="font-mono font-medium">{createResult.ownerTempPassword}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() =>
                        void navigator.clipboard.writeText(createResult.ownerTempPassword || "")
                      }
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </p>
                </div>
              )}
              <DialogFooter>
                <Button
                  onClick={() => {
                    router.push(`/admin/companies/${createResult.companyId}`)
                    resetCreateForm()
                    setCreateOpen(false)
                  }}
                >
                  Detaya Git
                </Button>
                <Button variant="outline" onClick={() => { resetCreateForm(); setCreateOpen(false) }}>
                  Kapat
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="grid gap-3 py-2">
                <div>
                  <Label>Müşteri / işletme adı *</Label>
                  <Input className="mt-1" value={formName} onChange={(e) => setFormName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Telefon</Label>
                    <Input className="mt-1" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
                  </div>
                  <div>
                    <Label>E-posta (işletme)</Label>
                    <Input className="mt-1" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
                  </div>
                </div>
                <div className="border-t pt-3 mt-1">
                  <p className="text-sm font-medium text-slate-700 mb-2">İlk giriş kullanıcısı (opsiyonel)</p>
                  <div className="grid gap-3">
                    <div>
                      <Label>E-posta (giriş) *</Label>
                      <Input className="mt-1" type="email" value={formOwnerEmail} onChange={(e) => setFormOwnerEmail(e.target.value)} />
                    </div>
                    <div>
                      <Label>Ad Soyad</Label>
                      <Input className="mt-1" value={formOwnerName} onChange={(e) => setFormOwnerName(e.target.value)} />
                    </div>
                  </div>
                </div>
                {createError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {createError}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>İptal</Button>
                <Button onClick={() => void handleCreateTenant()} disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Oluştur
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
