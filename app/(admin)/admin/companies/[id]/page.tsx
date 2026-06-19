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
  is_active: boolean
  created_at: string
  organization_id: string
}

interface OrgInfo {
  id: string
  name: string
  slug: string
}

interface Profile {
  id: string
  full_name: string
  role: string
}

interface SubDetail {
  id: string
  plan_id: string
  status: string
  trial_ends_at: string | null
  created_at: string
}

interface Stats {
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

  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [subscription, setSubscription] = useState<SubDetail | null>(null)
  const [stats, setStats] = useState<Stats>({
    customers: 0,
    appointments: 0,
    revenue: 0,
  })
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const { data: companyData } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single()

      if (!companyData) {
        setLoading(false)
        return
      }
      setCompany(companyData)

      const promises: PromiseLike<void>[] = []

      if (companyData.organization_id) {
        promises.push(
          // @ts-ignore — Supabase chain typing vs Promise.allSettled
          supabase
            .from("organizations")
            .select("id, name, slug")
            .eq("id", companyData.organization_id)
            .single()
            .then(({ data }) => {
              if (data) setOrg(data)
            })
        )
      }

      promises.push(
        supabase
          .from("profiles")
          .select("id, full_name, role")
          .eq("company_id", companyId)
          .order("role")
          .then(({ data }) => {
            if (data) setProfiles(data)
          })
      )

      promises.push(
        supabase
          .from("company_subscriptions")
          .select("id, plan_id, status, trial_ends_at, created_at")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()
          .then(({ data }) => {
            if (data) setSubscription(data)
          })
      )

      promises.push(
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .then(({ count }) => {
            setStats((prev) => ({ ...prev, customers: count ?? 0 }))
          })
      )

      promises.push(
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .then(({ count }) => {
            setStats((prev) => ({ ...prev, appointments: count ?? 0 }))
          })
      )

      promises.push(
        supabase
          .from("finance_transactions")
          .select("amount")
          .eq("company_id", companyId)
          .eq("type", "income")
          .then(({ data }) => {
            const total = (data || []).reduce(
              (sum, t) => sum + (t.amount || 0),
              0
            )
            setStats((prev) => ({ ...prev, revenue: total }))
          })
      )

      await Promise.allSettled(promises)
    } catch {
      /* silently fail */
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  function handleLoginAs() {
    alert(`Login as company: ${companyId} — Bu özellik henüz aktif değil.`)
  }

  const planLabels: Record<string, string> = {
    asistan: "aSistan",
    asistan_plus: "aSistan Plus",
    asistan_pro: "aSistan Pro",
  }

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
        <p className="text-slate-500">Şirket bulunamadı</p>
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
      {/* Header */}
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
              {org && (
                <button
                  onClick={() => router.push(`/admin/organizations/${org.id}`)}
                  className="hover:text-violet-600 transition-colors"
                >
                  {org.name}
                </button>
              )}
              {company.service_type && (
                <>
                  <span className="text-slate-300">·</span>
                  <span>{company.service_type}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {company.is_active ? (
            <Badge variant="success">Aktif</Badge>
          ) : (
            <Badge variant="destructive">Pasif</Badge>
          )}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Müşteriler",
            value: stats.customers,
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-100",
          },
          {
            label: "Randevular",
            value: stats.appointments,
            icon: Calendar,
            color: "text-emerald-600",
            bg: "bg-emerald-100",
          },
          {
            label: "Gelir",
            value: formatCurrency(stats.revenue, company.currency),
            icon: DollarSign,
            color: "text-amber-600",
            bg: "bg-amber-100",
          },
          {
            label: "Plan",
            value: subscription
              ? planLabels[subscription.plan_id] || subscription.plan_id
              : "Yok",
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

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="bg-slate-100 border border-slate-200">
          <TabsTrigger
            value="info"
            className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-500"
          >
            Bilgiler
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-500"
          >
            Kullanıcılar ({profiles.length})
          </TabsTrigger>
          <TabsTrigger
            value="subscription"
            className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-500"
          >
            Abonelik
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: "Şirket Adı", value: company.name, icon: Store },
                {
                  label: "Telefon",
                  value: company.phone || "—",
                  icon: Phone,
                },
                {
                  label: "E-posta",
                  value: company.email || "—",
                  icon: Mail,
                },
                {
                  label: "Adres",
                  value:
                    [company.address, company.city]
                      .filter(Boolean)
                      .join(", ") || "—",
                  icon: Globe,
                },
                {
                  label: "Sahip",
                  value: owner?.full_name || "—",
                  icon: UserCircle,
                },
                {
                  label: "Hizmet Türü",
                  value: company.service_type || "—",
                  icon: BarChart3,
                },
                {
                  label: "Para Birimi",
                  value: company.currency,
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
                    <p className="text-sm text-slate-900 mt-0.5">
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Users Tab */}
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
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                      Ad Soyad
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                      Rol
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => {
                    const roleLabel: Record<string, string> = {
                      owner: "Sahip",
                      admin: "Admin",
                      manager: "Yönetici",
                      employee: "Çalışan",
                    }
                    const roleBg: Record<string, string> = {
                      owner:
                        "bg-violet-100 text-violet-700 border-violet-200",
                      admin: "bg-blue-100 text-blue-700 border-blue-200",
                      manager:
                        "bg-amber-100 text-amber-700 border-amber-200",
                      employee:
                        "bg-slate-100 text-slate-600 border-slate-200",
                    }
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-slate-50"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <UserCircle className="h-5 w-5 text-slate-400" />
                            <span className="text-slate-900">
                              {p.full_name || "İsimsiz"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${roleBg[p.role] || roleBg.employee}`}
                          >
                            <Shield className="h-3 w-3" />
                            {roleLabel[p.role] || p.role}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription">
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
                      {planLabels[subscription.plan_id] ||
                        subscription.plan_id}
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
                        <Badge variant="secondary">
                          {subscription.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">
                      Deneme Bitiş
                    </p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">
                      {subscription.trial_ends_at
                        ? formatDate(subscription.trial_ends_at, "dd.MM.yyyy")
                        : "—"}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  Abonelik başlangıcı:{" "}
                  {formatDate(subscription.created_at, "dd.MM.yyyy HH:mm")}
                </div>
                {adminRole === "super_admin" && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={trialBusy}
                      onClick={async () => {
                        setTrialBusy(true)
                        const token = await getToken()
                        await fetch(`/api/admin/companies/${companyId}/trial`, {
                          method: "POST",
                          headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({ enable: true, days: 14 }),
                        })
                        setTrialBusy(false)
                        window.location.reload()
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
                        await fetch(`/api/admin/companies/${companyId}/trial`, {
                          method: "POST",
                          headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({ enable: false }),
                        })
                        setTrialBusy(false)
                        window.location.reload()
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
