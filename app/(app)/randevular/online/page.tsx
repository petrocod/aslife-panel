"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Link2, Copy } from "lucide-react"

export default function OnlineRandevularPage() {
  const [onlineEnabled, setOnlineEnabled] = useState(false)
  const [showPriceSetting, setShowPriceSetting] = useState(false)
  const shareLink = "https://b2c.aSistan.com/c/8ZjupjbI"

  return (
    <div className="p-6">
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Link2 className="h-3.5 w-3.5" />
          Link paylaş
        </Button>
      </div>

      <Tabs defaultValue="hizmetler">
        <TabsList className="mb-6 bg-transparent border-b border-slate-200 rounded-none h-auto p-0">
          {["Hizmetler", "Çalışanlar", "Bireysel Ayarlar", "Sınıflar", "Sınıf Ayarları"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab.toLowerCase().replace(" ", "-")}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 pb-3 mr-4 text-sm"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="hizmetler">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Hizmet adı</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Online randevu alınabilir</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Flyat göster</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="px-6 py-4 text-sm text-slate-800">test hizme</td>
                  <td className="px-6 py-4"><Switch defaultChecked /></td>
                  <td className="px-6 py-4"><Switch /></td>
                </tr>
                <tr className="border-b border-slate-100 last:border-0">
                  <td className="px-6 py-4 text-sm text-slate-800">Pilates hizmet1</td>
                  <td className="px-6 py-4"><Switch /></td>
                  <td className="px-6 py-4"><Switch defaultChecked /></td>
                </tr>
              </tbody>
            </table>
            <div className="flex justify-end p-4">
              <Button>Kaydet</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="çalışanlar">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Çalışan adı</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Online randevu alınabilir</th>
                </tr>
              </thead>
              <tbody>
                {["Adam ancel", "Çalışanın adı bir", "Çalışanın adı iki"].map((emp) => (
                  <tr key={emp} className="border-b border-slate-100 last:border-0">
                    <td className="px-6 py-4 text-sm text-slate-800">{emp}</td>
                    <td className="px-6 py-4"><Switch defaultChecked /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end p-4">
              <Button>Kaydet</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="bireysel-ayarlar">
          <div className="max-w-lg space-y-5">
            <div className="flex items-center justify-between py-2">
              <Label>Online Randevu Kullanımı</Label>
              <Switch checked={onlineEnabled} onCheckedChange={setOnlineEnabled} />
            </div>

            <div>
              <Label className="text-sm font-medium">Takvim *</Label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="calendar" defaultChecked className="text-blue-600" />
                  <span className="text-sm">Müşterim, takvimde tüm saatleri randevu alınmış bile olsa boş olarak görsün.</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="calendar" className="text-blue-600" />
                  <span className="text-sm">Müşterim, takvimde daha önce randevu alınmış saatleri dolu görsün.</span>
                </label>
              </div>
            </div>

            <div>
              <Label>Gösterilecek tarih süresi</Label>
              <Select defaultValue="1_ay">
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1_ay">1 Ay</SelectItem>
                  <SelectItem value="2_ay">2 Ay</SelectItem>
                  <SelectItem value="3_ay">3 Ay</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Kredisiz Katılım *</Label>
              <Select defaultValue="bekliyor">
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bekliyor">Bekliyor</SelectItem>
                  <SelectItem value="otomatik">Otomatik Onay</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Kredili Katılım *</Label>
              <Select defaultValue="otomatik">
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="otomatik">Otomatik Onay</SelectItem>
                  <SelectItem value="manuel">Manuel Onay</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-slate-100">
              <div className="flex items-center gap-1">
                <Label>SMS ile bilgilendirme</Label>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between py-2 border-t border-slate-100">
              <Label>E-posta ile bilgilendirme</Label>
              <Switch />
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
