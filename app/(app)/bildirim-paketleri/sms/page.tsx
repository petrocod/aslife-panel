"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  testVerimorConnectionAction,
  sendTestSmsAction,
  type ConnectionTestResult,
  type SendTestResult,
} from "@/lib/sms-actions"
import {
  CheckCircle2, XCircle, Loader2, Send, RefreshCw,
  MessageSquare, Wifi, CreditCard, AlertTriangle,
  Copy,
} from "lucide-react"

const smsPackages = [
  { name: "Demo", total: 100, used: 4, remaining: 96, date: "21.04.2025" },
]

const smsHistory = [
  { date: "21.04.2026", type: "Randevu Onayı", customer: "hiri almoan", status: "Gönderildi" },
  { date: "21.04.2026", type: "Randevu Onayı", customer: "musteri iki adı", status: "Gönderildi" },
  { date: "21.04.2026", type: "Yeni Müşteri", customer: "hiri almoan", status: "Gönderildi" },
  { date: "21.04.2026", type: "Yeni Müşteri", customer: "musteri iki adı", status: "Gönderildi" },
]

export default function SMSPage() {
  const [balance, setBalance] = useState<ConnectionTestResult | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)

  const [showTestModal, setShowTestModal] = useState(false)
  const [testDest, setTestDest] = useState("")
  const [testMsg, setTestMsg] = useState("Bu bir test mesajıdır. Verimor SMS entegrasyonu başarılı!")
  const [smsResult, setSmsResult] = useState<SendTestResult | null>(null)
  const [smsLoading, setSmsLoading] = useState(false)

  const fetchBalance = useCallback(async () => {
    setBalanceLoading(true)
    try {
      const result = await testVerimorConnectionAction()
      setBalance(result)
    } catch {
      setBalance({ ok: false, error: "Bağlantı hatası" })
    } finally {
      setBalanceLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  async function handleSendTestSms() {
    if (!testDest.trim() || !testMsg.trim()) return
    setSmsLoading(true)
    setSmsResult(null)
    try {
      const result = await sendTestSmsAction(testDest.trim(), testMsg.trim())
      setSmsResult(result)
      if (result.ok) fetchBalance()
    } catch (e) {
      setSmsResult({
        ok: false,
        error: e instanceof Error ? e.message : "Gönderim hatası",
      })
    } finally {
      setSmsLoading(false)
    }
  }

  return (
    <div className="p-6">
      {/* ── Üst Bar: Bakiye + Eylemler ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          {/* Verimor Bakiye Kartı */}
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-5 py-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-50">
              <CreditCard className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Verimor SMS Kredisi</p>
              {balanceLoading && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                  <span className="text-xs text-slate-400">Yükleniyor...</span>
                </div>
              )}
              {!balanceLoading && balance?.ok && (
                <p className="text-xl font-bold text-emerald-700">{balance.balance} <span className="text-xs font-normal text-slate-500">SMS</span></p>
              )}
              {!balanceLoading && balance && !balance.ok && (
                <div className="flex items-center gap-1 mt-0.5">
                  <XCircle className="h-3 w-3 text-red-400" />
                  <span className="text-xs text-red-500">{balance.error}</span>
                </div>
              )}
            </div>
            <button
              onClick={fetchBalance}
              disabled={balanceLoading}
              className="ml-2 p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Yenile"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${balanceLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Bağlantı Durumu */}
          {!balanceLoading && balance && (
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${
              balance.ok
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600"
            }`}>
              {balance.ok ? (
                <>
                  <Wifi className="h-3 w-3" />
                  <span>Verimor bağlı</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3" />
                  <span>Bağlantı hatası</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowTestModal(true)
              setSmsResult(null)
            }}
          >
            <Send className="h-3 w-3 mr-2" />
            Test SMS Gönder
          </Button>
          <Link href="/hesabim/ek-paketler" className="text-sm text-blue-600 hover:underline">
            SMS paketlerine git &rarr;
          </Link>
        </div>
      </div>

      <Tabs defaultValue="krediler">
        <TabsList className="mb-4 bg-white border border-slate-200 p-1 rounded-lg">
          <TabsTrigger value="krediler" className="data-[state=active]:bg-slate-100 px-4 py-1.5 text-sm">Kredilerim</TabsTrigger>
          <TabsTrigger value="gecmis" className="data-[state=active]:bg-slate-100 px-4 py-1.5 text-sm">Geçmiş kullanımlarım</TabsTrigger>
        </TabsList>

        <TabsContent value="krediler">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">SMS Paketi</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Toplam SMS</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Kullanılan SMS</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Kalan SMS</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Satın alınma tarihi</th>
                </tr>
              </thead>
              <tbody>
                {smsPackages.map((pkg) => (
                  <tr key={pkg.name} className="border-b border-slate-100 last:border-0">
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{pkg.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{pkg.total}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{pkg.used}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{pkg.remaining}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{pkg.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-3 border-t border-slate-100 text-xs text-slate-500">
              Toplam kayıt: {smsPackages.length} adet
            </div>
          </div>
        </TabsContent>

        <TabsContent value="gecmis">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Tarih</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Bildirim Tipi</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Müşteri</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Durum</th>
                </tr>
              </thead>
              <tbody>
                {smsHistory.map((h, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="px-6 py-4 text-sm text-slate-600">{h.date}</td>
                    <td className="px-6 py-4 text-sm text-slate-800">{h.type}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{h.customer}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{h.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Test SMS Modal ── */}
      <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              Test SMS Gönderimi
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Bağlantı Durumu */}
            <div className="flex items-center gap-2 text-xs">
              <Wifi className="h-3 w-3" />
              <span className="text-slate-500">Verimor:</span>
              {balance?.ok ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Aktif ({balance.balance} kredi)
                </span>
              ) : balance && !balance.ok ? (
                <span className="text-red-500 font-medium flex items-center gap-1">
                  <XCircle className="h-3 w-3" /> Hata
                </span>
              ) : (
                <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
              )}
            </div>

            <div>
              <Label className="text-xs text-slate-500">Telefon Numarası (Türkiye)</Label>
              <Input
                placeholder="05XX XXX XX XX"
                className="mt-1"
                value={testDest}
                onChange={(e) => setTestDest(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Mesaj Metni</Label>
              <textarea
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                rows={3}
                value={testMsg}
                onChange={(e) => setTestMsg(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-0.5">
                {testMsg.length} karakter
                {testMsg.length > 160 && <span className="text-amber-500 ml-1">({Math.ceil(testMsg.length / 153)} SMS boy)</span>}
              </p>
            </div>

            <Button
              onClick={handleSendTestSms}
              disabled={smsLoading || !testDest.trim()}
              className="w-full"
            >
              {smsLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              SMS Gönder
            </Button>

            {smsResult?.ok && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-md px-3 py-3 space-y-1">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">SMS başarıyla gönderildi!</span>
                </div>
                <div className="flex items-center gap-1 ml-6">
                  <span className="text-xs text-emerald-600">Kampanya ID: {smsResult.campaignId}</span>
                  <button
                    className="text-emerald-400 hover:text-emerald-600"
                    onClick={() => navigator.clipboard.writeText(smsResult.campaignId)}
                    title="Kopyala"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {smsResult && !smsResult.ok && (
              <div className="bg-red-50 border border-red-200 rounded-md px-3 py-3 space-y-2">
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">SMS gönderilemedi</span>
                </div>
                <p className="text-xs text-red-600 ml-6">{smsResult.error}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
