"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn, formatDate } from "@/lib/utils"
import {
  ArrowLeft,
  Building2,
  Store,
  Users,
  CreditCard,
  Loader2,
  Save,
  Clock,
  Mail,
  Shield,
  Activity,
  Plus,
  Phone,
} from "lucide-react"

interface OrgDetail {
  id: string
  name: string
  slug: string
  owner_email: string
  max_branches: number
  is_active: boolean
  metadata: Record<string, unknown> | null
  created_at: string
}

interface Company {
  id: string
  name: string
  phone: string
  email: string
  service_type: string
  is_active: boolean
  created_at: string
}

interface Member {
  user_id: string
  role: string
  status: string
  created_at: string
  profile: { full_name: string; email: string } | null
}

interface Subscription {
  id: string
  plan_id: string
  status: string
  trial_ends_at: string | null
  created_at: string
  company_id: string
}

interface AuditEntry {
  id: string
  action: string
  target_type: string
  target_id: string
  details: Record<string, unknown> | null
  created_at: string
  admin: { email: string } | null
}

async function getToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token || null
}

export default function OrganizationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params.id as string

  const [org, setOrg] = useState<OrgDetail | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [editName, setEditName] = useState("")
  const [editSlug, setEditSlug] = useState("")
  const [editMaxBranches, setEditMaxBranches] = useState(1)
  const [editActive, setEditActive] = useState(true)

  const [branchDialogOpen, setBranchDialogOpen] = useState(false)
  const [branchName, setBranchName] = useState("")
  const [branchPhone, setBranchPhone] = useState("")
  const [branchEmail, setBranchEmail] = useState("")
  const [branchServiceType, setBranchServiceType] = useState("")
  const [creatingBranch, setCreatingBranch] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const token = await getToken()
    if (!token) return

    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        setOrg(null)
        return
      }

      const json = await res.json()

      if (json.organization) {
        const orgData = json.organization
        setOrg(orgData)
        setEditName(orgData.name || "")
        setEditSlug(orgData.slug || "")
        setEditMaxBranches(orgData.max_branches || 1)
        setEditActive(orgData.is_active ?? true)
      }

      setCompanies(json.companies || [])
      setMembers(json.members || [])
      setSubscriptions(json.subscriptions || [])
      setAuditLog((json.auditLog || []).map((a: Record<string, unknown>) => ({ ...a, admin: null })))
    } catch {
      setOrg(null)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  async function handleSave() {
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          slug: editSlug,
          max_branches: editMaxBranches,
          is_active: editActive,
        }),
      })

      if (res.ok) {
        setOrg((prev) =>
          prev
            ? { ...prev, name: editName, slug: editSlug, max_branches: editMaxBranches, is_active: editActive }
            : prev
        )
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateBranch() {
    if (!branchName.trim()) return
    setCreatingBranch(true)
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: branchName.trim(),
          phone: branchPhone.trim(),
          email: branchEmail.trim(),
          service_type: branchServiceType.trim() || "beauty_salon",
          organization_id: orgId,
        }),
      })
      if (res.ok) {
        setBranchDialogOpen(false)
        setBranchName("")
        setBranchPhone("")
        setBranchEmail("")
        setBranchServiceType("")
        fetchAll()
      }
    } finally {
      setCreatingBranch(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Building2 className="h-12 w-12 text-slate-300" />
        <p className="text-slate-500">Organizasyon bulunamadı</p>
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/organizations")}
          className="text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Listeye Dön
        </Button>
      </div>
    )
  }

  const roleColors: Record<string, string> = {
    owner: "bg-violet-100 text-violet-700 border-violet-200",
    admin: "bg-blue-100 text-blue-700 border-blue-200",
    manager: "bg-amber-100 text-amber-700 border-amber-200",
    member: "bg-slate-100 text-slate-600 border-slate-200",
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/organizations")}
          className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{org.name}</h1>
            <p className="text-sm text-slate-500 font-mono">{org.slug}</p>
          </div>
        </div>
        <div className="ml-auto">
          {org.is_active ? (
            <Badge variant="success">Aktif</Badge>
          ) : (
            <Badge variant="destructive">Pasif</Badge>
          )}
        </div>
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
            value="companies"
            className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-500"
          >
            Şubeler ({companies.length})
          </TabsTrigger>
          <TabsTrigger
            value="members"
            className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-500"
          >
            Üyeler ({members.length})
          </TabsTrigger>
          <TabsTrigger
            value="subscription"
            className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-500"
          >
            Abonelik
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-500"
          >
            Aktivite
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info">
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Organizasyon Adı
                </label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Slug
                </label>
                <Input
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  className="border-slate-200 font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Sahip E-posta
                </label>
                <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-slate-50 border border-slate-200 text-slate-700 text-sm">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {org.owner_email || "—"}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Maks. Şube
                </label>
                <Input
                  type="number"
                  min={1}
                  value={editMaxBranches}
                  onChange={(e) => setEditMaxBranches(Number(e.target.value))}
                  className="border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Durum
                </label>
                <button
                  onClick={() => setEditActive(!editActive)}
                  className={cn(
                    "flex items-center gap-2 h-9 px-3 rounded-md border text-sm font-medium transition-colors",
                    editActive
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-red-50 border-red-200 text-red-700"
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      editActive ? "bg-emerald-500" : "bg-red-500"
                    )}
                  />
                  {editActive ? "Aktif" : "Pasif"}
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Oluşturulma
                </label>
                <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-slate-50 border border-slate-200 text-slate-700 text-sm">
                  <Clock className="h-4 w-4 text-slate-400" />
                  {formatDate(org.created_at, "dd.MM.yyyy HH:mm")}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Kaydet
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Companies Tab */}
        <TabsContent value="companies">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-700">
                Şubeler ({companies.length} / {org.max_branches})
              </p>
              <Button
                size="sm"
                onClick={() => setBranchDialogOpen(true)}
                disabled={companies.length >= org.max_branches}
                className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-8"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Yeni Şube
              </Button>
            </div>
            {companies.length === 0 ? (
              <div className="py-16 text-center">
                <Store className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-500 mt-2">
                  Bu organizasyona ait şube yok
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                      Şirket
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                      Telefon
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                      Tür
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                      Durum
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                      Kayıt
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/admin/companies/${c.id}`)}
                      className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-blue-500" />
                          <span className="text-slate-900 font-medium">
                            {c.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {c.phone || "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {c.service_type || "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {c.is_active ? (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {members.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-500 mt-2">
                  Bu organizasyonda üye yok
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                      Üye
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                      Rol
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                      Durum
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                      Katılım
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr
                      key={m.user_id}
                      className="border-b border-slate-50"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-slate-900 font-medium">
                            {m.profile?.full_name || "İsimsiz"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {m.profile?.email || m.user_id.slice(0, 8)}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border",
                            roleColors[m.role] || roleColors.member
                          )}
                        >
                          <Shield className="h-3 w-3" />
                          {m.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {m.status === "active" ? (
                          <Badge variant="success">Aktif</Badge>
                        ) : m.status === "pending" ? (
                          <Badge variant="warning">Beklemede</Badge>
                        ) : (
                          <Badge variant="secondary">{m.status}</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {formatDate(m.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {subscriptions.length === 0 ? (
              <div className="py-16 text-center">
                <CreditCard className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-500 mt-2">
                  Abonelik kaydı bulunamadı
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                      Plan
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                      Durum
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                      Deneme Bitiş
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                      Şirket
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                      Başlangıç
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((s) => (
                    <tr key={s.id} className="border-b border-slate-50">
                      <td className="py-3 px-4">
                        <span className="text-slate-900 font-medium">
                          {s.plan_id}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {s.status === "active" ? (
                          <Badge variant="success">Aktif</Badge>
                        ) : s.status === "trialing" ? (
                          <Badge variant="info">Deneme</Badge>
                        ) : s.status === "canceled" ? (
                          <Badge variant="destructive">İptal</Badge>
                        ) : (
                          <Badge variant="secondary">{s.status}</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {s.trial_ends_at
                          ? formatDate(s.trial_ends_at, "dd.MM.yyyy HH:mm")
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs font-mono">
                        {s.company_id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {formatDate(s.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {auditLog.length === 0 ? (
              <div className="py-16 text-center">
                <Activity className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-500 mt-2">
                  Aktivite kaydı bulunamadı
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {auditLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="px-4 py-3 flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Activity className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900">{entry.action}</p>
                      {entry.details && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {JSON.stringify(entry.details)}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {formatDate(entry.created_at, "dd.MM.yyyy HH:mm")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Branch Dialog */}
      <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
        <DialogContent className="bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Yeni Şube Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Şube Adı *
              </label>
              <Input
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Şube adı girin"
                className="border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Telefon
              </label>
              <Input
                value={branchPhone}
                onChange={(e) => setBranchPhone(e.target.value)}
                placeholder="05xx xxx xx xx"
                className="border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                E-posta
              </label>
              <Input
                value={branchEmail}
                onChange={(e) => setBranchEmail(e.target.value)}
                placeholder="sube@ornek.com"
                className="border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Hizmet Türü
              </label>
              <Input
                value={branchServiceType}
                onChange={(e) => setBranchServiceType(e.target.value)}
                placeholder="beauty_salon"
                className="border-slate-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBranchDialogOpen(false)}
              className="border-slate-200 text-slate-700"
            >
              İptal
            </Button>
            <Button
              onClick={handleCreateBranch}
              disabled={creatingBranch || !branchName.trim()}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {creatingBranch ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
