"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
  CheckCircle2, XCircle, Loader2, MessageSquare, Wifi, Send,
  CreditCard, Copy, CalendarDays,
} from "lucide-react"
import { useCompany } from "@/hooks/useCompany"
import { supabaseData as supabase } from "@/lib/supabase-data"

const integrations = [
  { id: "verimor", name: "Verimor SMS", logo: "verimor", description: "Verimor SMS API ile müşterilerinize otomatik bildirim, hatırlatma ve kampanya SMS'i gönderin.", connected: true },
  { id: "netgsm", name: "NetGSM", logo: "netgsm", description: "Bu eklenti sayesinde hizmetlerinizi NetGSM ile yapılandırabilirsiniz.", connected: false, comingSoon: true },
  { id: "parasut", name: "Paraşüt", logo: "parasut", description: "Bu eklenti sayesinde hizmetlerinizi Paraşüt ile yapılandırabilirsiniz.", connected: false, comingSoon: true },
  { id: "param", name: "Param", logo: "param", description: "Bu eklenti sayesinde hizmetlerinizi Param ile yapılandırabilirsiniz.", connected: false },
]

export default function EntegrasyonlarPage() {
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [connResult, setConnResult] = useState<ConnectionTestResult | null>(null)
  const [connLoading, setConnLoading] = useState(false)

  const [testDest, setTestDest] = useState("")
  const [testMsg, setTestMsg] = useState("Bu bir test mesajıdır. Verimor SMS entegrasyonu başarılı!")
  const [smsResult, setSmsResult] = useState<SendTestResult | null>(null)
  const [smsLoading, setSmsLoading] = useState(false)

  const { companyId } = useCompany()
  const [icalUrl, setIcalUrl] = useState("")
  const [googleCid, setGoogleCid] = useState("")
  const [icalCopied, setIcalCopied] = useState(false)

  useEffect(() => {
    if (!companyId) return
    supabase
      .from("employees")
      .select("calendar_token")
      .eq("company_id", companyId)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.calendar_token) {
          const base = typeof window !== "undefined" ? window.location.origin : ""
          setIcalUrl(`${base}/api/calendar/${data.calendar_token}`)
        }
      })
    supabase
      .from("settings")
      .select("google_calendar_cid")
      .eq("company_id", companyId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.google_calendar_cid) setGoogleCid(data.google_calendar_cid)
      })
  }, [companyId])

  const currentIntegration = integrations.find(i => i.id === activeModal)

  async function handleTestConnection() {
    setConnLoading(true)
    setConnResult(null)
    try {
      const result = await testVerimorConnectionAction()
      setConnResult(result)
    } catch (e) {
      setConnResult({
        ok: false,
        error: e instanceof Error ? e.message : "Beklenmeyen hata",
      })
    } finally {
      setConnLoading(false)
    }
  }

  async function handleSendTestSms() {
    if (!testDest.trim() || !testMsg.trim()) return
    setSmsLoading(true)
    setSmsResult(null)
    try {
      const result = await sendTestSmsAction(testDest.trim(), testMsg.trim())
      setSmsResult(result)
    } catch (e) {
      setSmsResult({
        ok: false,
        error: e instanceof Error ? e.message : "Beklenmeyen hata",
      })
    } finally {
      setSmsLoading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center text-center"
          >
            <div className="w-16 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-3">
              {integration.id === "verimor" ? (
                <MessageSquare className="h-6 w-6 text-emerald-600" />
              ) : (
                <span className="text-xs font-bold text-slate-600">{integration.name}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-slate-800">{integration.name}</h3>
              {integration.connected && (
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">{integration.description}</p>
            {integration.comingSoon ? (
              <>
                <p className="text-xs text-red-500 mb-2">Entegrasyon yetkiniz bulunmamaktadır.</p>
                <Button variant="outline" size="sm" className="text-xs">Yakında</Button>
              </>
            ) : (
              <Button
                size="sm"
                className="text-xs"
                onClick={() => {
                  setActiveModal(integration.id)
                  if (integration.id === "verimor") {
                    setConnResult(null)
                    setSmsResult(null)
                  }
                }}
              >
                {integration.connected ? "Ayarlar" : "Bağlan"}
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* ── Google Calendar / iCal ── */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-slate-800">Google Calendar Senkronizasyonu</h3>
        </div>
        <p className="text-xs text-slate-500">
          Randevularınızı Google Calendar ile senkronize edin. Aşağıdaki iCal URL&apos;sini Google Calendar &gt; &quot;Add by URL&quot; ile ekleyin.
        </p>
        {icalUrl && (
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">iCal URL</Label>
            <div className="flex items-center gap-2">
              <Input value={icalUrl} readOnly className="text-xs font-mono" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => { navigator.clipboard.writeText(icalUrl); setIcalCopied(true); setTimeout(() => setIcalCopied(false), 2000) }}
              >
                {icalCopied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Google Calendar Grup Takvimi (CID)</Label>
          <div className="flex items-center gap-2">
            <Input
              value={googleCid}
              onChange={(e) => setGoogleCid(e.target.value)}
              placeholder="Google Calendar CID linkinizi yapıştırın"
              className="text-xs"
            />
            <Button
              size="sm"
              onClick={async () => {
                if (!companyId) return
                await supabase.from("settings").update({ google_calendar_cid: googleCid }).eq("company_id", companyId)
              }}
            >
              Kaydet
            </Button>
          </div>
          <p className="text-[10px] text-slate-400">
            Bu link personel tarafından grup takvimini görüntülemek için kullanılır.
          </p>
        </div>
      </div>

      {/* ── Verimor SMS Modal ── */}
      <Dialog open={activeModal === "verimor"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              Verimor SMS Entegrasyonu
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* ── Bağlantı Testi ── */}
            <div className="rounded-lg border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">Bağlantı Testi</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={connLoading}
                >
                  {connLoading && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                  Bağlantıyı Test Et
                </Button>
              </div>

              {connResult?.ok && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-md px-3 py-3 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">Bağlantı başarılı!</span>
                  </div>
                  <div className="flex items-center gap-2 ml-6">
                    <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-sm text-emerald-700">
                      Kalan kredi: <strong className="text-lg">{connResult.balance}</strong> SMS
                    </span>
                  </div>
                </div>
              )}

              {connResult && !connResult.ok && (
                <div className="bg-red-50 border border-red-200 rounded-md px-3 py-3 space-y-2">
                  <div className="flex items-center gap-2 text-red-700">
                    <XCircle className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">Bağlantı hatası</span>
                  </div>
                  <p className="text-xs text-red-600 ml-6">{connResult.error}</p>
                </div>
              )}
            </div>

            {/* ── Test SMS Gönderimi ── */}
            <div className="rounded-lg border border-slate-200 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Send className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Test SMS Gönderimi</span>
              </div>

              <div>
                <Label className="text-xs text-slate-500">Telefon Numarası</Label>
                <Input
                  placeholder="05XX XXX XX XX"
                  className="mt-1"
                  value={testDest}
                  onChange={(e) => setTestDest(e.target.value)}
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Türkiye numarası: 05XXXXXXXXX veya 905XXXXXXXXX</p>
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
                size="sm"
                onClick={handleSendTestSms}
                disabled={smsLoading || !testDest.trim()}
                className="w-full"
              >
                {smsLoading ? (
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                ) : (
                  <Send className="h-3 w-3 mr-2" />
                )}
                Test SMS Gönder
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

          </div>
        </DialogContent>
      </Dialog>

      {/* ── Diğer Entegrasyonlar Modal ── */}
      <Dialog
        open={!!activeModal && activeModal !== "verimor"}
        onOpenChange={() => setActiveModal(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentIntegration?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kullanıcı adı</Label>
              <Input placeholder="tohid@seyahatmarket.com" className="mt-1.5" defaultValue="tohid@seyahatmarket.com" />
            </div>
            <div>
              <Label>Şifre</Label>
              <Input type="password" className="mt-1.5" defaultValue="••••••••••••••" />
            </div>
            {currentIntegration?.id === "netgsm" && (
              <div>
                <Label>Hesap başlığı</Label>
                <Input placeholder="Hesap başlığı giriniz" className="mt-1.5" />
              </div>
            )}
            {currentIntegration?.id === "param" && (
              <>
                <div>
                  <Label>Hesap anahtarı</Label>
                  <Input placeholder="Hesap anahtarı giriniz" className="mt-1.5" />
                </div>
                <div>
                  <Label>Hesap kodu</Label>
                  <Input placeholder="Hesap kodu giriniz" className="mt-1.5" />
                </div>
              </>
            )}
            <div className="flex items-center justify-between pt-2">
              <Label>Durum</Label>
              <Switch />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setActiveModal(null)}>Vazgeç</Button>
            <Button onClick={() => setActiveModal(null)}>Kaydet</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
