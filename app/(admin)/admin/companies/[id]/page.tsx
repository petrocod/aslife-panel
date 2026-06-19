"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { formatDate, formatCurrency } from "@/lib/utils"
import { useAdmin } from "@/hooks/useAdmin"
import {
  ArrowLeft,
  Store,
  Users,
  CreditCard,
  Loader2,
  LogIn,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  Globe,
  Shield,
  UserCircle,
  BarChart3,
  Clock,
  ExternalLink,
} from "lucide-react"

interface CompanyDetail {
  id: string
  name: string
  phone: string
  email: string
  address: string | null
  city: string | null
  currency: string
  service_type: string
  created_at: string
  organization_id: string
}

interface OrgInfo {
  id: string
  name: string
  slug: string
  owner_email: string | null
}

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  role: string
  is_active: boolean
  last_login: string | null
  created_at: string
}

interface SubDetail {
  id: string
  plan_id: string
  status: string
  trial_ends_at: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean | null
  mrr: number | null
  created_at: string
  updated_at: string
  subscription_plans: {
    id: string
    name_tr: string
    monthly_price: number
    annual_price: number
  } | null
}

interface Stats {
  users: number
  customers: number
  appointments: number
  revenue: number
}

async function getToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token || null
}

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string
  const { adminRole } = useAdmin()
  const [trialBusy, setTrialBusy] = useState(false)
  const [activeTab, setActiveTab] = useState("info")

  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [subscription, setSubscription] = useState<SubDetail | null>(null)
  const [stats, setStats] = useState<Stats>({
    users: 0,
    customers: 0,
    appointments: 0,
    revenue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const token = await getToken()
      if (!token) {
        setError("Oturum bulunamadı.")
        return
      }

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
      setOrg(json.organization || null)
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

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.location.hash === "#subscription") {
      setActiveTab("subscription")
    }
  }, [])

  function handleLoginAs() {
    alert(`Login as company: ${companyId} — Bu özellik henüz aktif değil.`)
  }

  const planLabels: Record<string, string> = {
    asistan: "aSistan",
    asistan_plus: "aSistan Plus",
    asistan_pro: "aSistan Pro",
  }

  const planName =
    subscription?.subscription_plans?.name_tr ||
    (subscription ? planLabels[subscription.plan_id] || subscription.plan_id : "Yok")

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Store className="h-12 w-12 text-slate-300" />
        <p className="text-slate-500">{error || "Şirket bulunamadı"}</p>
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/companies")}
          className="text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Listeye Dön
        </Button>
      </div>
    )
  }

  const owner = profiles.find((p) => p.role === "owner")

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/companies")}
          className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Store className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{company.name}</h1>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              {org && <span>{org.name}</span>}
              {company.service_type && (
                <>
                  <span className="text-slate-300">·</span>
                  <span>{company.service_type}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/admin/users?companyId=${companyId}`)}
          >
            <Users className="h-4 w-4 mr-2" />
            Kullanıcılar ({stats.users})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(`/admin/subscriptions?companyId=${companyId}`)
            }
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Abonelik
          </Button>
          <Button
            onClick={handleLoginAs}
            variant="outline"
            size="sm"
            className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Olarak Giriş Yap
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Giriş Kullanıcıları",
            value: stats.users,
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-100",
          },
          {
            label: "Kayıtlı Müşteriler",
            value: stats.customers,
            icon: UserCircle,
            color: "text-indigo-600",
            bg: "bg-indigo-100",
          },
          {
            label: "Randevular",
            value: stats.appointments,
            icon: Calendar,
            color: "text-emerald-600",
            bg: "bg-emerald-100",
          },
          {
            label: "Plan",
            value: planName,
            icon: CreditCard,
            color: "text-violet-600",
            bg: "bg-violet-100",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}
              >
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className="text-lg font-semibold text-slate-900">
                  {card.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {subscription && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500 uppercase">Abonelik Durumu</p>
            <p className="font-medium mt-1">{subscription.status}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Başlangıç</p>
            <p className="font-medium mt-1">
              {formatDate(subscription.created_at, "dd.MM.yyyy")}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">
              {subscription.status === "trialing" ? "Deneme Bitiş" : "Periyot Sonu"}
            </p>
            <p className="font-medium mt-1">
              {subscription.status === "trialing" && subscription.trial_ends_at
                ? formatDate(subscription.trial_ends_at, "dd.MM.yyyy")
                : subscription.current_period_end
                  ? formatDate(subscription.current_period_end, "dd.MM.yyyy")
                  : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Aylık Ücret</p>
            <p className="font-medium mt-1">
              {subscription.subscription_plans?.monthly_price != null
                ? formatCurrency(
                    subscription.subscription_plans.monthly_price,
                    company.currency
                  )
                : subscription.mrr
                  ? formatCurrency(subscription.mrr, company.currency)
                  : "—"}
            </p>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 border border-slate-200">
          <TabsTrigger value="info">Bilgiler</TabsTrigger>
          <TabsTrigger value="users">
            Kullanıcılar ({profiles.length})
          </TabsTrigger>
          <TabsTrigger value="subscription">Abonelik</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: "Şirket Adı", value: company.name, icon: Store },
                { label: "Telefon", value: company.phone || "—", icon: Phone },
                { label: "E-posta", value: company.email || "—", icon: Mail },
                {
                  label: "Adres",
                  value:
                    [company.address, company.city].filter(Boolean).join(", ") ||
                    "—",
                  icon: Globe,
                },
                {
                  label: "Sahip",
                  value: owner?.full_name || owner?.email || "—",
                  icon: UserCircle,
                },
                {
                  label: "Hizmet Türü",
                  value: company.service_type || "—",
                  icon: BarChart3,
                },
                {
                  label: "Gelir (toplam)",
                  value: formatCurrency(stats.revenue, company.currency),
                  icon: DollarSign,
                },
                {
                  label: "Kayıt Tarihi",
                  value: formatDate(company.created_at, "dd.MM.yyyy HH:mm"),
                  icon: Clock,
                },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    <item.icon className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">
                      {item.label}
                    </p>
                    <p className="text-sm text-slate-900 mt-0.5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="mb-3 flex justify-end">
            <Button
              size="sm"
              onClick={() => router.push(`/admin/users?companyId=${companyId}`)}
            >
              <UserCircle className="h-4 w-4 mr-2" />
              Kullanıcı Ekle
            </Button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {profiles.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-500 mt-2">
                  Kullanıcı bulunamadı
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                      Ad Soyad
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                      E-posta
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                      Rol
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                      Durum
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                      Son Giriş
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => {
                    const roleLabel: Record<string, string> = {
                      owner: "Sahip",
                      admin: "Admin",
                      manager: "Yönetici",
                      member: "Üye",
                      employee: "Çalışan",
                    }
                    return (
                      <tr key={p.id} className="border-b border-slate-50">
                        <td className="py-3 px-4">{p.full_name || "—"}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {p.email || "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-xs">
                            <Shield className="h-3 w-3" />
                            {roleLabel[p.role] || p.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={p.is_active ? "success" : "destructive"}>
                            {p.is_active ? "Aktif" : "Askıda"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {p.last_login
                            ? formatDate(p.last_login, "dd.MM.yyyy HH:mm")
                            : "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="subscription" id="subscription">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            {!subscription ? (
              <div className="py-12 text-center">
                <CreditCard className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-500 mt-2">
                  Aktif abonelik bulunamadı
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">
                      Plan
                    </p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">
                      {planName}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">
                      Durum
                    </p>
                    <div className="mt-2">
                      {subscription.status === "active" ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : subscription.status === "trialing" ? (
                        <Badge variant="info">Deneme</Badge>
                      ) : subscription.status === "canceled" ? (
                        <Badge variant="destructive">İptal</Badge>
                      ) : (
                        <Badge variant="secondary">{subscription.status}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">
                      {subscription.status === "trialing"
                        ? "Deneme Bitiş"
                        : "Periyot Sonu"}
                    </p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">
                      {subscription.status === "trialing" &&
                      subscription.trial_ends_at
                        ? formatDate(subscription.trial_ends_at, "dd.MM.yyyy")
                        : subscription.current_period_end
                          ? formatDate(
                              subscription.current_period_end,
                              "dd.MM.yyyy"
                            )
                          : "—"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                  <p>
                    Abonelik başlangıcı:{" "}
                    {formatDate(subscription.created_at, "dd.MM.yyyy HH:mm")}
                  </p>
                  <p>
                    Son güncelleme:{" "}
                    {formatDate(subscription.updated_at, "dd.MM.yyyy HH:mm")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    router.push(`/admin/subscriptions?companyId=${companyId}`)
                  }
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abonelikler sayfasında yönet
                </Button>
                {adminRole === "super_admin" && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={trialBusy}
                      onClick={async () => {
                        setTrialBusy(true)
                        const token = await getToken()
                        await fetch(
                          `/api/admin/companies/${companyId}/trial`,
                          {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${token}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ enable: true, days: 14 }),
                          }
                        )
                        setTrialBusy(false)
                        await fetchAll()
                      }}
                    >
                      14 gün deneme aç
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={trialBusy}
                      onClick={async () => {
                        setTrialBusy(true)
                        const token = await getToken()
                        await fetch(
                          `/api/admin/companies/${companyId}/trial`,
                          {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${token}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ enable: false }),
                          }
                        )
                        setTrialBusy(false)
                        await fetchAll()
                      }}
                    >
                      Denemeyi kapat
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
