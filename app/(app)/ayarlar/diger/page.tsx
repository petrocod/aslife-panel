"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@radix-ui/react-radio-group"

const reminderOptions = [
  { value: "12_hours", label: "12 Saat" },
  { value: "1_day", label: "1 Gün" },
  { value: "2_days", label: "2 Gün" },
  { value: "3_days", label: "3 Gün" },
  { value: "4_days", label: "4 Gün" },
]

export default function DigerPage() {
  const [smsReminder, setSmsReminder] = useState(true)
  const [notificationMask, setNotificationMask] = useState(false)
  const [attendanceMethod, setAttendanceMethod] = useState("manual")
  const [acceptedSms, setAcceptedSms] = useState(false)
  const [acceptedEmail, setAcceptedEmail] = useState(false)
  const [rejectedSms, setRejectedSms] = useState(false)
  const [rejectedEmail, setRejectedEmail] = useState(false)

  return (
    <div className="p-6">
      <Tabs defaultValue="genel">
        <TabsList className="mb-6 bg-white border border-slate-200 p-1 rounded-lg">
          <TabsTrigger value="genel" className="data-[state=active]:bg-slate-100 px-4 py-1.5 text-sm">Genel</TabsTrigger>
          <TabsTrigger value="paketler" className="data-[state=active]:bg-slate-100 px-4 py-1.5 text-sm">Paketler</TabsTrigger>
          <TabsTrigger value="krediler" className="data-[state=active]:bg-slate-100 px-4 py-1.5 text-sm">Krediler</TabsTrigger>
          <TabsTrigger value="katilim" className="data-[state=active]:bg-slate-100 px-4 py-1.5 text-sm">Katılım Durumu</TabsTrigger>
        </TabsList>

        <TabsContent value="genel">
          <div className="space-y-6 max-w-lg">
            <div>
              <Label className="text-sm font-medium text-slate-700">Randevu Hatırlatma Zamanı *</Label>
              <Select defaultValue="1_day">
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reminderOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700">Ödeme Hatırlatma Zamanı *</Label>
              <Select defaultValue="2_days">
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reminderOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700">Sms Paket Kullanım Yüzdesi</Label>
              <Input defaultValue="80" className="mt-1.5" />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <Label>Sms Paketi Hatırlatma Gönderiml</Label>
              <Switch checked={smsReminder} onCheckedChange={setSmsReminder} />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <Label>Bildirim Gizliliği</Label>
              <Switch checked={notificationMask} onCheckedChange={setNotificationMask} />
            </div>

            {notificationMask && (
              <div>
                <Label>Bildirim Gizliği Karakter Uzunluğu</Label>
                <Input placeholder="Birim(karakter)" className="mt-1.5" />
              </div>
            )}

            <div className="flex justify-end">
              <Button>Kaydet</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="paketler">
          <div className="space-y-6 max-w-lg">
            <div>
              <Label className="text-sm font-medium text-slate-700">Paket Hatırlatma Zamanı</Label>
              <Select defaultValue="2_days">
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reminderOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Paket Kullanımı</Label>
              <Input defaultValue="80" className="mt-1.5" />
            </div>
            <div className="flex justify-end">
              <Button>Kaydet</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="krediler">
          <div className="space-y-6 max-w-lg">
            <div>
              <Label className="text-sm font-medium text-slate-700">Kredi Hatırlatma Zamanı</Label>
              <Select defaultValue="2_days">
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reminderOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button>Kaydet</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="katilim">
          <div className="space-y-6 max-w-lg">
            <div>
              <Label className="text-sm font-medium text-slate-700">Randevu Katılım Yönetimi *</Label>
              <div className="flex flex-col gap-2 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="attendance"
                    value="manual"
                    checked={attendanceMethod === "manual"}
                    onChange={() => setAttendanceMethod("manual")}
                    className="text-blue-600"
                  />
                  <span className="text-sm">Manuel Yönetim (Kendim Yapacağım)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="attendance"
                    value="automatic"
                    checked={attendanceMethod === "automatic"}
                    onChange={() => setAttendanceMethod("automatic")}
                    className="text-blue-600"
                  />
                  <span className="text-sm">Otomatik Yönetim (Müşteriler Üzerinden)</span>
                </label>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700">Katılım Onayı Son Süresi</Label>
              <Select defaultValue="6_hours">
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6_hours">6 Saat</SelectItem>
                  <SelectItem value="12_hours">12 Saat</SelectItem>
                  <SelectItem value="1_day">1 Gün</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700">Katılım Hatırlatma Bildirim Zamanı</Label>
              <Select defaultValue="12_hours">
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6_hours">6 Saat</SelectItem>
                  <SelectItem value="12_hours">12 Saat</SelectItem>
                  <SelectItem value="1_day">1 Gün</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {[
                { label: "Kabul Edilen Katılımlar İçin SMS Bildirimi", state: acceptedSms, setState: setAcceptedSms },
                { label: "Kabul Edilen Katılımlar İçin E posta Bildirimi", state: acceptedEmail, setState: setAcceptedEmail },
                { label: "Reddedilen Katılımlar İçin SMS Bildirimi", state: rejectedSms, setState: setRejectedSms },
                { label: "Reddedilen Katılımlar İçin E-posta Bildirimi", state: rejectedEmail, setState: setRejectedEmail },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-100">
                  <Label className="text-sm">{item.label}</Label>
                  <Switch checked={item.state} onCheckedChange={item.setState} />
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button>Kaydet</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
