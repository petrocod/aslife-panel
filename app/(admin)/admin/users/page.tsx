"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Users,
  Eye,
  Ban,
  Trash2,
  Loader2,
  ShieldCheck,
  UserPlus,
  Copy,
  CheckCircle,
  X,
  Store,
  KeyRound,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn, formatDate } from "@/lib/utils"

interface UserRow {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  role: string | null
  is_active: boolean
  last_login: string | null
  created_at: string
  company_id: string | null
  organization_id: string | null
  companies: { id: string; name: string } | null
  organizations: { id: string; name: string } | null
}

const ROLE_BADGE: Record<string, { label: string; variant: "info" | "success" | "secondary" }> = {
  owner: { label: "Sahip", variant: "info" },
  manager: { label: "Yönetici", variant: "success" },
  member: { label: "Üye", variant: "secondary" },
}

const LIMIT = 20

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AdminUsersContent />
    </Suspense>
  )
}

function AdminUsersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetCompanyId = searchParams.get("companyId") || ""
  const [filterCompanyId, setFilterCompanyId] = useState(presetCompanyId)
  const [filterCompanyName, setFilterCompanyName] = useState("")
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    userId: string
    action: string
    title: string
    description: string
  }>({ open: false, userId: "", action: "", title: "", description: "" })

  const [detailDialog, setDetailDialog] = useState<{
    open: boolean
    user: UserRow | null
  }>({ open: false, user: null })

  const [createDialog, setCreateDialog] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [newFullName, setNewFullName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newCompanyId, setNewCompanyId] = useState("")
  const [newRole, setNewRole] = useState("member")
  const [creating, setCreating] = useState(false)
  const [createResult, setCreateResult] = useState<{ tempPassword: string; message: string } | null>(null)
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])

  const [passwordDialog, setPasswordDialog] = useState<{
    open: boolean
    user: UserRow | null
    loading: boolean
    tempPassword: string | null
  }>({ open: false, user: null, loading: false, tempPassword: null })

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const token = await getToken()
      if (!token) {
        setFetchError("Oturum bulunamadı. Tekrar giriş yapın.")
        return
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: LIMIT.toString(),
      })
      if (search) params.set("search", search)
      if (filterCompanyId) params.set("companyId", filterCompanyId)

      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()

      if (res.ok) {
        setUsers(data.users)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      } else {
        setUsers([])
        setTotal(0)
        setFetchError(data.error || "Kullanıcılar yüklenemedi.")
      }
    } finally {
      setLoading(false)
    }
  }, [page, search, filterCompanyId])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSearch = () => {
    setPage(1)
    setSearch(searchInput)
  }

  const handleAction = async (userId: string, action: string, extra?: Record<string, unknown>) => {
    setActionLoading(true)
    try {
      const token = await getToken()
      if (!token) return

      let res: Response
      if (action === "delete") {
        res = await fetch(`/api/admin/users/${userId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      } else {
        res = await fetch(`/api/admin/users/${userId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action, ...extra }),
        })
      }

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(json.error || "İşlem başarısız.")
        return
      }

      setConfirmDialog((p) => ({ ...p, open: false }))
      await fetchUsers()
    } finally {
      setActionLoading(false)
    }
  }

  const openConfirm = (userId: string, action: string, title: string, description: string) => {
    setConfirmDialog({ open: true, userId, action, title, description })
  }

  async function loadCompanies() {
    const token = await getToken()
    if (!token) return
    const res = await fetch("/api/admin/companies?limit=100", {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const json = await res.json()
      setCompanies((json.companies || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
    }
  }

  useEffect(() => {
    if (!presetCompanyId) return
    setFilterCompanyId(presetCompanyId)
    setNewCompanyId(presetCompanyId)
    void loadCompanies()
  }, [presetCompanyId])

  useEffect(() => {
    if (!filterCompanyId) {
      setFilterCompanyName("")
      return
    }
    void (async () => {
      const token = await getToken()
      if (!token) return
      const res = await fetch(`/api/admin/companies/${filterCompanyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setFilterCompanyName(json.company?.name || "")
      }
    })()
  }, [filterCompanyId])

  async function handleCreateUser() {
    if (!newEmail || !newCompanyId) return
    setCreating(true)
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          fullName: newFullName,
          phone: newPhone,
          companyId: newCompanyId,
          role: newRole,
        }),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setCreateResult({ tempPassword: json.tempPassword, message: json.message })
        fetchUsers()
      } else {
        alert(json.error || "Hata oluştu")
      }
    } finally {
      setCreating(false)
    }
  }

  function resetCreateDialog() {
    setNewEmail("")
    setNewFullName("")
    setNewPhone("")
    setNewCompanyId(filterCompanyId || "")
    setNewRole("member")
    setCreateResult(null)
    setCreateDialog(false)
  }

  function openCreateDialog() {
    setNewCompanyId(filterCompanyId || newCompanyId || "")
    setCreateDialog(true)
    void loadCompanies()
  }

  async function handleResetUserPassword() {
    if (!passwordDialog.user) return
    setPasswordDialog((p) => ({ ...p, loading: true }))
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch(`/api/admin/users/${passwordDialog.user.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "set_password" }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error || "Hata oluştu")
        setPasswordDialog({ open: false, user: null, loading: false, tempPassword: null })
        return
      }
      setPasswordDialog((p) => ({
        ...p,
        loading: false,
        tempPassword: json.tempPassword || null,
      }))
    } finally {
      setPasswordDialog((p) => ({ ...p, loading: false }))
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Kullanıcı Yönetimi</h1>
        <Badge variant="secondary" className="ml-2">
          {total} kullanıcı
        </Badge>
      </div>

      {filterCompanyId && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-muted-foreground" />
            <span>
              Filtre:{" "}
              <strong>{filterCompanyName || filterCompanyId}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(`/admin/companies/${filterCompanyId}`)
              }
            >
              Müşteri Detayı
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterCompanyId("")
                setFilterCompanyName("")
                router.push("/admin/users")
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Ad veya e-posta ile ara..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} variant="secondary">
          Ara
        </Button>
        <Button onClick={openCreateDialog} className="gap-1">
          <UserPlus className="h-4 w-4" /> Yeni Kullanıcı
        </Button>
      </div>

      {fetchError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {fetchError}
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Ad Soyad</th>
                <th className="px-4 py-3 text-left font-medium">E-posta</th>
                <th className="px-4 py-3 text-left font-medium">Telefon</th>
                <th className="px-4 py-3 text-left font-medium">Şirket</th>
                <th className="px-4 py-3 text-left font-medium">Rol</th>
                <th className="px-4 py-3 text-left font-medium">Durum</th>
                <th className="px-4 py-3 text-left font-medium">Kayıt Tarihi</th>
                <th className="px-4 py-3 text-right font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">Yükleniyor...</p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    Kullanıcı bulunamadı.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const roleMeta = ROLE_BADGE[user.role || "member"] || ROLE_BADGE.member
                  return (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{user.full_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{user.phone || "—"}</td>
                      <td className="px-4 py-3">
                        {user.companies?.name ? (
                          <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() =>
                              router.push(
                                `/admin/companies/${user.company_id}`
                              )
                            }
                          >
                            {user.companies.name}
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={roleMeta.variant}>{roleMeta.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={user.is_active ? "success" : "destructive"}>
                          {user.is_active ? "Aktif" : "Askıda"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setDetailDialog({ open: true, user })}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Detay
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setPasswordDialog({
                                  open: true,
                                  user,
                                  loading: false,
                                  tempPassword: null,
                                })
                              }
                            >
                              <KeyRound className="mr-2 h-4 w-4" />
                              Şifre Sıfırla
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.is_active ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  openConfirm(
                                    user.id,
                                    "suspend",
                                    "Hesabı Askıya Al",
                                    `${user.full_name || user.email} kullanıcısının hesabını askıya almak istediğinize emin misiniz?`
                                  )
                                }
                                className="text-orange-600 focus:text-orange-600"
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Hesabı Askıya Al
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  openConfirm(
                                    user.id,
                                    "activate",
                                    "Hesabı Aktifleştir",
                                    `${user.full_name || user.email} kullanıcısının hesabını aktifleştirmek istediğinize emin misiniz?`
                                  )
                                }
                                className="text-green-600 focus:text-green-600"
                              >
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                Hesabı Aktifleştir
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() =>
                                openConfirm(
                                  user.id,
                                  "delete",
                                  "Hesabı Sil",
                                  `${user.full_name || user.email} kullanıcısının hesabını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
                                )
                              }
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Hesabı Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Toplam {total} kullanıcı, Sayfa {page}/{totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((p) => ({ ...p, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog((p) => ({ ...p, open: false }))}
              disabled={actionLoading}
            >
              İptal
            </Button>
            <Button
              variant={confirmDialog.action === "delete" || confirmDialog.action === "suspend" ? "destructive" : "default"}
              onClick={() => handleAction(confirmDialog.userId, confirmDialog.action)}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialog.open}
        onOpenChange={(open) => setDetailDialog((p) => ({ ...p, open }))}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kullanıcı Detayı</DialogTitle>
          </DialogHeader>
          {detailDialog.user && (
            <div className="grid gap-3 text-sm">
              <Row label="Ad Soyad" value={detailDialog.user.full_name} />
              <Row label="E-posta" value={detailDialog.user.email} />
              <Row label="Telefon" value={detailDialog.user.phone} />
              <Row label="Şirket" value={detailDialog.user.companies?.name} />
              <Row
                label="Rol"
                value={ROLE_BADGE[detailDialog.user.role || "member"]?.label || detailDialog.user.role}
              />
              <Row label="Durum" value={detailDialog.user.is_active ? "Aktif" : "Askıda"} />
              <Row label="Son Giriş" value={detailDialog.user.last_login ? formatDate(detailDialog.user.last_login, "dd.MM.yyyy HH:mm") : null} />
              <Row label="Kayıt Tarihi" value={formatDate(detailDialog.user.created_at, "dd.MM.yyyy HH:mm")} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createDialog} onOpenChange={(open) => { if (!open) resetCreateDialog(); else setCreateDialog(true) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Kullanıcı Oluştur</DialogTitle>
            <DialogDescription>
              Giriş hesabı oluşturun. Kullanıcı şifresini Hesabım → Profil veya Şifremi Unuttum ile kendisi değiştirir.
            </DialogDescription>
          </DialogHeader>

          {createResult ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <p className="font-medium text-emerald-800">Kullanıcı başarıyla oluşturuldu!</p>
                </div>
                <p className="text-sm text-emerald-700 mb-3">
                  Aşağıdaki geçici şifreyi müşteriye gönderin. İlk girişten sonra profilden değiştirebilir.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between bg-white rounded px-3 py-2">
                    <span className="text-slate-600">E-posta:</span>
                    <span className="font-mono font-medium">{newEmail}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white rounded px-3 py-2">
                    <span className="text-slate-600">Geçici Şifre:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{createResult.tempPassword}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigator.clipboard.writeText(createResult.tempPassword)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={resetCreateDialog}>Kapat</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>E-posta *</Label>
                <Input type="email" placeholder="ornek@firma.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Ad Soyad</Label>
                <Input placeholder="Ad Soyad" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input placeholder="+90 5XX XXX XX XX" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Şirket *</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newCompanyId} onChange={(e) => setNewCompanyId(e.target.value)}>
                  <option value="">Şirket seçin...</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                  <option value="member">Üye</option>
                  <option value="manager">Yönetici</option>
                  <option value="owner">Sahip</option>
                </select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetCreateDialog}>İptal</Button>
                <Button onClick={handleCreateUser} disabled={creating || !newEmail || !newCompanyId}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Oluştur
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog
        open={passwordDialog.open}
        onOpenChange={(open) => {
          if (!open) setPasswordDialog({ open: false, user: null, loading: false, tempPassword: null })
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanıcı Şifresi Sıfırla</DialogTitle>
            <DialogDescription>
              {passwordDialog.user?.full_name || passwordDialog.user?.email} için yeni geçici şifre
              oluşturulacak.
            </DialogDescription>
          </DialogHeader>
          {passwordDialog.tempPassword ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-800 mb-2">Yeni geçici şifre:</p>
              <div className="flex items-center justify-between bg-white rounded px-3 py-2 font-mono text-sm">
                {passwordDialog.tempPassword}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => navigator.clipboard.writeText(passwordDialog.tempPassword!)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setPasswordDialog({ open: false, user: null, loading: false, tempPassword: null })
              }
            >
              {passwordDialog.tempPassword ? "Kapat" : "İptal"}
            </Button>
            {!passwordDialog.tempPassword && (
              <Button onClick={handleResetUserPassword} disabled={passwordDialog.loading}>
                {passwordDialog.loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sıfırla
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className={cn("flex items-center justify-between rounded-md px-3 py-2", "odd:bg-muted/40")}>
      <span className="font-medium text-muted-foreground">{label}</span>
      <span>{value || "—"}</span>
    </div>
  )
}
