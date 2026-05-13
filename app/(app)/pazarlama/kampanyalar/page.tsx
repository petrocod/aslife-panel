"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateInput } from "@/components/shared/DateInput"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export default function KampanyalarPage() {
  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-base font-semibold text-slate-800 mb-6">Kampanya oluştur</h2>

      <div className="space-y-5">
        <div>
          <Label className="flex items-center gap-1 text-sm mb-1.5">
            📅 Kampanya başlığı *
          </Label>
          <Input placeholder="Lütfen Yazın" />
        </div>

        <div>
          <Label className="flex items-center gap-1 text-sm mb-1.5">
            🎯 Hedef kitle seçimi *
          </Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Seçiniz..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm müşteriler</SelectItem>
              <SelectItem value="active">Aktif müşteriler</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="flex items-center gap-1 text-sm mb-1.5">
            📅 Tarih Aralığı *
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <DateInput value="" onChange={() => {}} placeholder="Başlangıç tarihi" />
            <DateInput value="" onChange={() => {}} placeholder="Bitiş tarihi" />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700 mb-3">Kanal</p>
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <input type="checkbox" id="sms" defaultChecked className="rounded" />
              <label htmlFor="sms" className="text-sm font-medium">SMS</label>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">SMS İçeriği</Label>
                <button className="text-xs text-blue-600 hover:underline">Değişken Ekle ↓</button>
              </div>
              <Textarea placeholder="SMS içeriğini buraya girin..." rows={4} />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-slate-400">Mesajınızı kişiselleştirmek için değişkenleri kullanın</p>
                <span className="text-xs text-slate-400">0/500</span>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Mesaj Önizleme</p>
              <div className="bg-slate-100 rounded-lg px-4 py-3 min-h-[60px]">
                <p className="text-xs text-slate-400">Önizleme burada görünecek...</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border rounded-lg p-4 opacity-50">
          <input type="checkbox" id="whatsapp" disabled />
          <label htmlFor="whatsapp" className="text-sm">Whatsapp</label>
          <span className="text-xs text-slate-500 ml-2">WhatsApp entegrasyonu yakında kullanıma sunulacak</span>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
        <Button variant="outline">Vazgeç</Button>
        <Button variant="outline">Taslağı Kaydet</Button>
        <Button>Kaydet</Button>
      </div>
    </div>
  )
}
