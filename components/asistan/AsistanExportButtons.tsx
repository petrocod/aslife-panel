"use client"

import { Download, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { downloadCsv, printReportHtml, rowsToCsv } from "@/lib/export-report"
import { ASISTAN_PRESET_LABELS, type AsistanDatePreset } from "@/lib/asistan-range"
import type { AsistanTab } from "@/lib/asistan-tabs"
import type { useAsistanDashboard } from "@/hooks/useAsistanDashboard"

type DashboardData = ReturnType<typeof useAsistanDashboard>["data"]

type Props = {
  tab: AsistanTab
  preset: AsistanDatePreset
  data: DashboardData
}

export function AsistanExportButtons({ tab, preset, data }: Props) {
  const title = `Asistan — ${tab} — ${ASISTAN_PRESET_LABELS[preset]}`

  function exportExcel() {
    let headers: string[] = []
    let rows: (string | number)[][] = []

    if (tab === "finansal") {
      headers = ["Tarih", "Müşteri", "Hizmet", "Tür", "Toplam"]
      rows = data.financialRows.map((r) => [r.date, r.customer, r.service, r.type, r.total])
    } else if (tab === "musteri") {
      headers = ["Müşteri", "Randevu", "Onaylı", "Kazanç"]
      rows = data.customerRows.map((r) => [r.name, r.totalApp, r.onayApp, r.earned])
    } else if (tab === "personel") {
      headers = ["Personel", "Hizmet", "Toplam", "Onaylı"]
      rows = data.staffRows.map((r) => [r.employee, r.service, r.total, r.onay])
    } else if (tab === "prim") {
      headers = ["Hizmet", "Gelir", "Prim"]
      rows = data.primRowsByService.map((r) => [r.service, r.totalRevenue, r.primAmount])
    } else {
      headers = ["Metrik", "Değer"]
      rows = [
        ["Toplam gelir", data.totalRevenue],
        ["Randevu sayısı", data.appointmentCount],
        ["Yeni müşteri", data.newCustomers],
      ]
    }

    const csv = rowsToCsv(headers, rows)
    downloadCsv(`asistan-${tab}-${preset}.csv`, csv)
  }

  function exportPdf() {
    let tableHtml = ""
    if (tab === "finansal" && data.financialRows.length) {
      tableHtml = `<table><thead><tr><th>Tarih</th><th>Açıklama</th><th>Tutar</th></tr></thead><tbody>${data.financialRows
        .slice(0, 80)
        .map(
          (r) =>
            `<tr><td>${r.date}</td><td>${r.customer}</td><td>${r.total}</td></tr>`
        )
        .join("")}</tbody></table>`
    } else {
      tableHtml = `<p>Toplam gelir: ${data.totalRevenue}</p><p>Randevu: ${data.appointmentCount}</p>`
    }
    printReportHtml(title, tableHtml)
  }

  return (
    <div className="flex gap-2">
      <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={exportExcel}>
        <Download className="h-3.5 w-3.5" />
        Excel (CSV)
      </Button>
      <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={exportPdf}>
        <FileText className="h-3.5 w-3.5" />
        PDF
      </Button>
    </div>
  )
}
