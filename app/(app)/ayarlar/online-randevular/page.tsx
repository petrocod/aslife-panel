"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save } from "lucide-react"

export default function OnlineRandevularPage() {
  const [enabled, setEnabled] = useState(true)
  const [minNotice, setMinNotice] = useState("60")
  const [maxAdvance, setMaxAdvance] = useState("30")
  const [confirmType, setConfirmType] = useState("auto")
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-6 max-w-xl">
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h2 className="font-semibold text-slate-800">Online Randevu Ayarları</h2>

          {saved && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
              Ayarlar kaydedildi!
            </div>
          )}

          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <Label className="text-sm font-medium text-slate-700">Online Randevuları Aktif Et</Label>
              <p className="text-xs text-slate-500 mt-0.5">Müşteriler online randevu alabilsin</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div>
            <Label className="text-xs font-medium text-slate-600">Onay Türü</Label>
            <Select value={confirmType} onValueChange={setConfirmType}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Otomatik Onayla</SelectItem>
                <SelectItem value="manual">Manuel Onayla</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium text-slate-600">Minimum Önceden Bildirim Süresi (dakika)</Label>
            <Input
              type="number"
              value={minNotice}
              onChange={(e) => setMinNotice(e.target.value)}
              className="mt-1.5"
              min="0"
            />
            <p className="text-xs text-slate-400 mt-1">Randevudan kaç dakika önce alınabilir</p>
          </div>

          <div>
            <Label className="text-xs font-medium text-slate-600">Maksimum İleri Rezervasyon (gün)</Label>
            <Input
              type="number"
              value={maxAdvance}
              onChange={(e) => setMaxAdvance(e.target.value)}
              className="mt-1.5"
              min="1"
            />
            <p className="text-xs text-slate-400 mt-1">Kaç gün ilerisi için randevu alınabilir</p>
          </div>

          <Button onClick={handleSave} className="w-full gap-2">
            <Save className="h-4 w-4" />
            Kaydet
          </Button>
        </div>
      </div>
    </div>
  )
}
