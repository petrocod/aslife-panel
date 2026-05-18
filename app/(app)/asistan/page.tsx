"use client"

import { type ReactNode, type Dispatch, type SetStateAction, useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Briefcase,
  LineChart,
  Calendar,
  User,
  Percent,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { useCompany } from "@/hooks/useCompany"
import { cn } from "@/lib/utils"
import { normalizeAsistanTab, type AsistanTab } from "@/lib/asistan-tabs"
import {
  useAsistanDashboard,
  type VatMode,
  type PieSeg,
  type FinancialRow,
  type CollectionDetailRow,
  type ExpenseDetailRow,
  type AppointmentListRow,
  type PrimServiceTableRow,
  type PrimEmployeeTableRow,
} from "@/hooks/useAsistanDashboard"
import {
  ASISTAN_PRESET_LABELS,
  type AsistanDatePreset,
  type BarPoint,
} from "@/lib/asistan-range"
import { AsistanExportButtons } from "@/components/asistan/AsistanExportButtons"

function formatTry(n: number) {
  return `₺${n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/** Pasta dilimi adından sayısal değer (ilk eşleşme) */
function pieSliceValue(pie: PieSeg[], ...labels: string[]) {
  for (const l of labels) {
    const f = pie.find((s) => s.name === l)
    if (f != null) return f.value
  }
  return 0
}

function fmtCountTr(n: number) {
  return Math.round(n).toLocaleString("tr-TR")
}

function fmtPctTr(n: number) {
  return `%${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** KPI kart içi üst blok — Finansal Satışlar ile aynı iki sütun hizası */
const kpiRowTwoColsClass =
  "flex flex-wrap items-start justify-between gap-4"

const PRESET_ORDER: AsistanDatePreset[] = [
  "today",
  "this_week",
  "this_month",
  "this_year",
  "last_month",
  "last_year",
]

const CHART_BAR_H = 328
const CHART_PIE_H = 192
const CHART_BAR_H_GUNCEL = 300

/** Tablo: başlık satırı + zebra — Finansal / Müşteri / Personel / Prim ile uyumlu */
const dashTbl = {
  wrap: "overflow-x-auto",
  table: "w-full border-collapse text-sm min-w-[640px]",
  thead: "border-b border-slate-200 bg-slate-50",
  th: "text-left p-3 text-xs font-semibold text-slate-700 whitespace-nowrap",
  tr: "border-b border-slate-100 last:border-b-0 odd:bg-white even:bg-slate-50/80",
  td: "p-3 align-middle text-sm text-slate-700",
  tdNum: "p-3 align-middle text-sm text-slate-700 tabular-nums",
  tdAccent: "p-3 align-middle text-sm font-semibold text-slate-900 tabular-nums",
  emptyCell: "py-10 px-4 text-center text-muted-foreground text-sm",
}

/** Finansal detay — ~5 satır sığacak daha sıkı satır yüksekliği */
const finansalDetailTbl = {
  ...dashTbl,
  th: "text-left py-2.5 px-3 text-xs font-semibold text-slate-700 whitespace-nowrap",
  td: "py-2 px-3 align-middle text-sm text-slate-700",
  tdNum: "py-2 px-3 align-middle text-sm text-slate-700 tabular-nums",
  tdAccent: "py-2 px-3 align-middle text-sm font-semibold text-slate-900 tabular-nums",
}

const FINANSAL_DETAIL_PAGE_SIZE = 5

type FinansalDetailCard = "satis" | "tahsilat" | "alacak" | "servis" | "gider"
type MusteriDetailCard = "kayit" | "cinsiyet" | "randevu"
type PersonelDetailCard = "randevu_sayisi" | "gelir"
type PrimDetailCard = "prim_ozet" | "komisyon_randevu"

const PIE_ICON_GUNCEL_COMPACT_H = 128
/** Güncel alt üç kart — geniş ekranda daha büyük pasta */
const PIE_ICON_GUNCEL_ROW_SPACIOUS_H = 200

/** Güncel durum kart başlıkları — biraz daha büyük, hizalı */
const guncelCardTitleClass = "text-[1.0625rem] font-semibold text-slate-900 tracking-tight"
const guncelCardHeaderClass =
  "border-b border-slate-100 bg-white px-5 py-3.5 flex items-center min-h-[3.5rem] shrink-0"

const guncelCardShell =
  "min-w-0 h-full rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] flex flex-col overflow-hidden"

function SatislarOzetiCard({
  totalSales,
  totalCollections,
  remainingBalance,
  avgPerCustomer,
  totalDiscount,
}: {
  totalSales: number
  totalCollections: number
  remainingBalance: number
  avgPerCustomer: number
  totalDiscount: number
}) {
  const c = Math.max(0, totalCollections)
  const b = Math.max(0, remainingBalance)
  const sumSeg = c + b

  return (
    <Card className={`${guncelCardShell} flex flex-1 flex-col min-h-0 w-full min-w-0`}>
      <CardHeader className={guncelCardHeaderClass}>
        <CardTitle className={guncelCardTitleClass}>Satışlar</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col min-h-0 px-5 pb-6 pt-5">
        <div className="shrink-0">
          <p className="text-xs font-medium text-slate-500">Toplam Satış</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">{formatTry(totalSales)}</p>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-3 min-h-[5rem] py-2">
          <div
            className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-200/90 ring-1 ring-slate-200/80"
            role="img"
            aria-label="Tahsilat ve bakiye oranı"
          >
            {sumSeg <= 0 ? (
              <div className="h-full w-full bg-slate-200" />
            ) : (
              <>
                <div style={{ flex: c }} className="min-w-0 h-full bg-[#0095FF]" />
                <div style={{ flex: b }} className="min-w-0 h-full bg-[#93c5fd]" />
              </>
            )}
          </div>

          <div className="flex justify-between gap-4 text-xs text-slate-600">
            <div className="flex gap-2 min-w-0">
              <span
                className="mt-0.5 size-2.5 shrink-0 rounded-sm bg-[#0095FF]"
                aria-hidden
              />
              <div className="min-w-0">
                <p>Toplam tahsilat</p>
                <p className="text-sm font-semibold text-slate-900 tabular-nums mt-0.5">
                  {formatTry(totalCollections)}
                </p>
              </div>
            </div>
            <div className="flex gap-2 min-w-0 text-right justify-end">
              <div className="min-w-0">
                <p className="flex items-center justify-end gap-1.5">
                  Kalan bakiye
                  <span
                    className="size-2.5 shrink-0 rounded-sm bg-[#93c5fd]"
                    aria-hidden
                  />
                </p>
                <p className="text-sm font-semibold text-slate-900 tabular-nums mt-0.5">
                  {formatTry(remainingBalance)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4 mt-auto shrink-0 space-y-4">
          <div className="flex gap-3">
            <User className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" aria-hidden />
            <div>
              <p className="text-xs text-slate-600">Müşteri başına ort. satış</p>
              <p className="text-sm font-semibold text-slate-900 tabular-nums mt-0.5">
                {formatTry(avgPerCustomer)}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Percent className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" aria-hidden />
            <div>
              <p className="text-xs text-slate-600">Yapılan indirim toplamı</p>
              <p className="text-sm font-semibold text-slate-900 tabular-nums mt-0.5">
                {formatTry(totalDiscount)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/** Gelir Dağılımı (Satış) — ödeme tarihine göre; önceki dönem koyu mavi, bu dönem açık mavi */
function GelirDagilimiSatis({
  barData,
  height = CHART_BAR_H,
}: {
  barData: BarPoint[]
  height?: number
}) {
  const maxVal = Math.max(0, ...barData.flatMap((d) => [d.buDonem, d.oncekiDonem]))
  let yMax = 1
  let ticks: number[] = [0, 0.2, 0.4, 0.6, 0.8, 1]

  if (maxVal > 0) {
    if (maxVal <= 1) {
      const dayStep = maxVal <= 0.2 ? 0.1 : 0.2
      yMax = Math.max(1, Math.ceil(maxVal / dayStep) * dayStep)
      ticks = []
      for (let t = 0; t <= yMax + 1e-9; t += dayStep) ticks.push(Math.round(t * 100) / 100)
    } else {
      const raw = maxVal / 10
      const pow10 = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-9))))
      const norm = raw / pow10
      const niceNorm =
        norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10
      const step = niceNorm * pow10
      yMax = Math.ceil(maxVal / step) * step
      ticks = []
      for (let t = 0; t <= yMax + 1e-9; t += step) ticks.push(t)
    }
  }

  const fmtY = (v: number) => {
    if (maxVal <= 1 && maxVal > 0)
      return v.toLocaleString("tr-TR", { maximumFractionDigits: 2, minimumFractionDigits: 0 })
    return Number(v).toLocaleString("tr-TR", { maximumFractionDigits: 0 })
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={barData}
        barGap={4}
        barCategoryGap="22%"
        margin={{ top: 8, right: 10, left: 4, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e8ec" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={{ stroke: "#cbd5e1" }}
          tickLine={false}
        />
        <YAxis
          domain={[0, yMax]}
          ticks={ticks}
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickFormatter={fmtY}
          width={56}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number) => formatTry(value)}
          labelStyle={{ fontSize: 12, fontWeight: 600 }}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar
          dataKey="oncekiDonem"
          name="Önceki dönem"
          fill="#0369a1"
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
        <Bar
          dataKey="buDonem"
          name="Bu dönem"
          fill="#7dd3fc"
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Pasta + legend; guncel = sadece renk+başlık; finansal = örnek 2: sol büllet+etiket, sağda değer */
function PieBlock({
  data,
  label,
  valueMode = "try",
  compact = false,
  spacious = false,
  appearance = "default",
}: {
  data: PieSeg[]
  label?: string
  valueMode?: "try" | "count"
  compact?: boolean
  spacious?: boolean
  appearance?: "default" | "guncel" | "finansal"
}) {
  const has = data.some((d) => d.value > 0)
  const spaciousCompact = compact && spacious
  const guncel = appearance === "guncel"
  const finansal = appearance === "finansal"
  const h = compact ? (spaciousCompact ? PIE_ICON_GUNCEL_ROW_SPACIOUS_H : PIE_ICON_GUNCEL_COMPACT_H) : CHART_PIE_H
  const innerR = !compact ? 48 : spaciousCompact ? (guncel ? 44 : 42) : 32
  const outerR = !compact ? 76 : spaciousCompact ? (guncel ? 70 : 68) : 52
  if (!has) {
    return (
      <div
        className={`flex flex-col items-center justify-center text-muted-foreground ${compact ? (spaciousCompact ? "text-xs min-h-[120px] xl:min-h-[160px]" : "text-xs min-h-[88px]") : "text-sm min-h-[160px]"}`}
      >
        {label ?? "Veri yok"}
      </div>
    )
  }

  function fmtLegendVal(v: number) {
    if (valueMode === "count") return String(Math.round(v))
    return formatTry(v)
  }

  const rows = [...data].filter((d) => d.value > 0).sort((a, b) => b.value - a.value)

  return (
    <div
      className={cn(
        "w-full min-w-0 flex flex-col justify-center gap-3",
        finansal && "gap-3 sm:gap-3.5",
        compact && !spaciousCompact && !finansal && "sm:flex-row sm:items-center sm:justify-start sm:gap-2",
        spaciousCompact &&
          (guncel
            ? "sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-5 xl:gap-6"
            : !finansal &&
                "sm:flex-row sm:items-center sm:justify-start gap-3 sm:gap-4 xl:gap-5"),
        !compact && !finansal && "sm:flex-row sm:items-start justify-center gap-4"
      )}
    >
        <div
          className={cn(
            "shrink-0 w-full",
            finansal && "mx-auto w-full max-w-[200px] shrink-0 lg:max-w-[220px]",
            !compact && !finansal && "max-w-[200px]",
            compact && !spaciousCompact && !finansal && "max-w-[132px]",
            spaciousCompact && (guncel ? "max-w-[170px] sm:max-w-[188px] xl:max-w-[210px]" : "max-w-[150px] sm:max-w-[168px] xl:max-w-[220px]")
          )}
          style={{ height: finansal ? CHART_PIE_H : h }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: compact ? 4 : 8, bottom: compact ? 4 : 8, left: compact ? 4 : 8, right: compact ? 4 : 8 }}>
              <Pie
                data={rows}
                cx="50%"
                cy="50%"
                innerRadius={innerR}
                outerRadius={outerR}
                paddingAngle={compact ? 0.8 : 1}
                dataKey="value"
                nameKey="name"
              >
              {rows.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            {!guncel && (
              <Tooltip formatter={(v: number, name: string) => [fmtLegendVal(Number(v)), name]} />
            )}
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul
        className={cn(
          "min-w-0 w-full leading-tight text-slate-600",
          !finansal && "flex-1",
          finansal && "w-full shrink-0 space-y-1.5 pt-0.5 text-xs text-slate-600",
          guncel && "space-y-2.5 text-xs text-slate-600",
          compact && !spaciousCompact && !guncel && !finansal && "space-y-1 max-w-none text-[10px]",
          spaciousCompact && !guncel && !finansal && "space-y-1.5 max-w-none text-[10px] sm:text-[11px] xl:text-xs",
          !compact && !guncel && !finansal && "max-w-[220px] space-y-1.5 text-[11px]"
        )}
      >
        {rows.map((seg, idx) => (
          <li
            key={`${idx}-${seg.name}`}
            className={cn(
              guncel && "flex items-center gap-2.5 text-xs",
              finansal &&
                "flex w-full min-w-0 items-center justify-between gap-3 py-0 text-xs",
              !guncel && !finansal && "flex items-start gap-2"
            )}
          >
            {finansal ? (
              <>
                <div className="flex min-w-0 flex-1 items-center gap-2 pr-2">
                  <span
                    className="size-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: seg.color }}
                    aria-hidden
                  />
                  <span className="break-words font-medium leading-snug text-slate-600">{seg.name}</span>
                </div>
                <span className="shrink-0 text-right text-xs font-semibold tabular-nums text-slate-900 sm:text-[13px]">
                  {fmtLegendVal(seg.value)}
                </span>
              </>
            ) : (
              <>
            <span
              className={cn(
                "shrink-0",
                guncel ? "size-2.5 rounded-[2px]" : "mt-1 size-2 rounded-full"
              )}
              style={{ backgroundColor: seg.color }}
              aria-hidden
            />
            <span
              className={cn(
                "min-w-0 break-words",
                guncel ? "text-slate-600 font-medium leading-snug" : "flex-1"
              )}
            >
              {seg.name}
            </span>
            {!guncel && (
              <span className="shrink-0 tabular-nums font-medium text-slate-800">
                {fmtLegendVal(seg.value)}
              </span>
            )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Primler — çalışana göre dik bar (tek seri ₺) */
function PrimBarByEmployee({
  series,
  height = CHART_PIE_H,
  fillParent = false,
}: {
  series: { name: string; prim: number }[]
  height?: number
  /** Kart içinde kalan dikey alanı doldur (ResponsiveContainer %100) */
  fillParent?: boolean
}) {
  const has = series.some((s) => s.prim > 0)
  const emptyMinH = fillParent ? "min-h-[200px]" : ""
  if (!has) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center text-muted-foreground text-sm",
          emptyMinH,
          fillParent && "h-full min-h-[200px] flex-1",
        )}
        style={!fillParent ? { minHeight: height } : undefined}
      >
        Veri yok
      </div>
    )
  }

  const data = series.map((s) => ({
    name: s.name.length > 24 ? `${s.name.slice(0, 21)}…` : s.name,
    prim: s.prim,
    labelFull: s.name,
  }))

  const maxVal = Math.max(...data.map((d) => d.prim), 0)
  let yMax = 1
  let ticks: number[] = [0, 1]

  if (maxVal > 0) {
    if (maxVal <= 1) {
      const dayStep = maxVal <= 0.2 ? 0.1 : 0.2
      yMax = Math.max(1, Math.ceil(maxVal / dayStep) * dayStep)
      ticks = []
      for (let t = 0; t <= yMax + 1e-9; t += dayStep) ticks.push(Math.round(t * 100) / 100)
    } else {
      const raw = maxVal / 10
      const pow10 = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-9))))
      const norm = raw / pow10
      const niceNorm =
        norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10
      const step = niceNorm * pow10
      yMax = Math.ceil(maxVal / step) * step
      ticks = []
      for (let t = 0; t <= yMax + 1e-9; t += step) ticks.push(t)
    }
  }

  const fmtY = (v: number) => {
    if (maxVal <= 1 && maxVal > 0)
      return v.toLocaleString("tr-TR", { maximumFractionDigits: 2, minimumFractionDigits: 0 })
    return Number(v).toLocaleString("tr-TR", { maximumFractionDigits: 0 })
  }

  const outerClass = fillParent ? "relative h-full min-h-[200px] w-full flex-1" : "w-full"

  return (
    <div className={outerClass}>
      <ResponsiveContainer width="100%" height={fillParent ? "100%" : height}>
      <BarChart
        data={data}
        barGap={4}
        barCategoryGap="24%"
        margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e8ec" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={{ stroke: "#cbd5e1" }}
          tickLine={false}
          interval={0}
          height={48}
          tickMargin={8}
        />
        <YAxis
          domain={[0, yMax]}
          ticks={ticks}
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickFormatter={fmtY}
          width={56}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number) => formatTry(value)}
          labelFormatter={(label, pl) =>
            Array.isArray(pl) && pl[0] && typeof (pl[0] as { payload?: { labelFull?: string } }).payload?.labelFull === "string"
              ? ((pl[0] as { payload: { labelFull: string } }).payload.labelFull as string)
              : String(label ?? "")
          }
          labelStyle={{ fontSize: 12, fontWeight: 600 }}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="prim" name="Prim" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Üst KPI kartı — tıklanınca alt detay tablosu seçime bağlanır */
function SelectableDashCard<T extends string>(props: {
  selected: T
  kind: T
  onPick: (k: T) => void
  children: ReactNode
  cardClassName?: string
}) {
  const { selected, kind, onPick, children, cardClassName } = props
  return (
    <Card
      role="button"
      tabIndex={0}
      className={cn(
        "rounded-xl border bg-white overflow-hidden transition-[box-shadow,border-color] outline-none cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
        selected === kind
          ? "border-blue-600 ring-2 ring-blue-600/25 shadow-md"
          : "border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.06)] hover:border-slate-300 hover:shadow-[0_2px_8px_rgba(15,23,42,0.08)]",
        cardClassName,
      )}
      onClick={() => onPick(kind)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onPick(kind)
        }
      }}
    >
      {children}
    </Card>
  )
}

function DashDetailPaginationFooter(props: {
  busy: boolean
  pageSafe: number
  totalPages: number
  totalRecords: number
  setPage: Dispatch<SetStateAction<number>>
}) {
  const { busy, pageSafe, totalPages, totalRecords, setPage } = props
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          aria-label="Önceki sayfa"
          disabled={pageSafe <= 1 || busy}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        {totalPages <= 12
          ? Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`Sayfa ${n}`}
                aria-current={pageSafe === n ? "page" : undefined}
                disabled={busy}
                onClick={() => setPage(n)}
                className={cn(
                  "min-w-9 px-2 py-1.5 text-sm tabular-nums rounded-md border transition-colors disabled:opacity-50",
                  pageSafe === n
                    ? "border-blue-600 bg-white font-semibold text-blue-700"
                    : "border-transparent bg-transparent text-slate-600 hover:bg-slate-100",
                )}
              >
                {n}
              </button>
            ))
          : (
              <span className="px-2 text-sm tabular-nums text-slate-700">
                {pageSafe} / {totalPages}
              </span>
            )}
        <button
          type="button"
          aria-label="Sonraki sayfa"
          disabled={pageSafe >= totalPages || busy}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <p className="text-sm text-slate-600">
        Toplam kayıt:{" "}
        <span className="font-semibold tabular-nums text-slate-900">{totalRecords}</span> adet
      </p>
    </div>
  )
}

export default function AsistanPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" /></div>}>
      <AsistanPage />
    </Suspense>
  )
}

function AsistanPage() {
  const { companyId, loading: companyLoading } = useCompany()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = normalizeAsistanTab(searchParams.get("tab"))
  const [preset, setPreset] = useState<AsistanDatePreset>("this_week")
  const [vatMode, setVatMode] = useState<VatMode>("include")
  const [finansalDetailCard, setFinansalDetailCard] =
    useState<FinansalDetailCard>("satis")
  const [finansalDetailPage, setFinansalDetailPage] = useState(1)

  const [musteriDetailCard, setMusteriDetailCard] =
    useState<MusteriDetailCard>("kayit")
  const [musteriDetailPage, setMusteriDetailPage] = useState(1)

  const [personelDetailCard, setPersonelDetailCard] =
    useState<PersonelDetailCard>("randevu_sayisi")
  const [personelDetailPage, setPersonelDetailPage] = useState(1)

  const [primDetailCard, setPrimDetailCard] = useState<PrimDetailCard>("prim_ozet")
  const [primDetailPage, setPrimDetailPage] = useState(1)

  function pickFinansalDetailCard(next: FinansalDetailCard) {
    setFinansalDetailCard(next)
    setFinansalDetailPage(1)
  }

  function pickMusteriDetailCard(next: MusteriDetailCard) {
    setMusteriDetailCard(next)
    setMusteriDetailPage(1)
  }

  function pickPersonelDetailCard(next: PersonelDetailCard) {
    setPersonelDetailCard(next)
    setPersonelDetailPage(1)
  }

  function pickPrimDetailCard(next: PrimDetailCard) {
    setPrimDetailCard(next)
    setPrimDetailPage(1)
  }

  function setTab(next: AsistanTab) {
    router.replace(`/asistan?tab=${next}`, { scroll: false })
  }

  const { loading, error, data } = useAsistanDashboard(companyId, preset, vatMode, tab)

  const busy = companyLoading || loading

  useEffect(() => {
    setFinansalDetailPage(1)
    setMusteriDetailPage(1)
    setPersonelDetailPage(1)
    setPrimDetailPage(1)
  }, [companyId, preset, vatMode, tab])

  const finansalDetailAllRows:
    | FinancialRow[]
    | CollectionDetailRow[]
    | ExpenseDetailRow[] = (() => {
        switch (finansalDetailCard) {
          case "satis":
            return data.financialRows
          case "tahsilat":
            return data.collectionRows
          case "alacak":
            return data.receivableRows
          case "servis":
            return data.serviceAppointmentRows
          case "gider":
            return data.expenseRows
          default:
            return data.financialRows
        }
      })()

  const finansalDetailTotal = finansalDetailAllRows.length
  const finansalDetailTotalPages = Math.max(
    1,
    Math.ceil(finansalDetailTotal / FINANSAL_DETAIL_PAGE_SIZE),
  )
  const finansalDetailPageSafe = Math.min(
    Math.max(1, finansalDetailPage),
    finansalDetailTotalPages,
  )
  const finDetailOffset =
    (finansalDetailPageSafe - 1) * FINANSAL_DETAIL_PAGE_SIZE
  const finansalDetailPageRows = finansalDetailAllRows.slice(
    finDetailOffset,
    finDetailOffset + FINANSAL_DETAIL_PAGE_SIZE,
  )

  const musteriDetailAllRows =
    musteriDetailCard === "randevu"
      ? data.appointmentRows
      : musteriDetailCard === "kayit"
        ? data.customerRows.filter((r) => r.registrationBucket === "in_range")
        : data.customerRows

  const musteriDetailTotal = musteriDetailAllRows.length
  const musteriDetailTotalPages = Math.max(
    1,
    Math.ceil(musteriDetailTotal / FINANSAL_DETAIL_PAGE_SIZE),
  )
  const musteriDetailPageSafe = Math.min(
    Math.max(1, musteriDetailPage),
    musteriDetailTotalPages,
  )
  const musteriOffset =
    (musteriDetailPageSafe - 1) * FINANSAL_DETAIL_PAGE_SIZE
  const musteriDetailPageRows = musteriDetailAllRows.slice(
    musteriOffset,
    musteriOffset + FINANSAL_DETAIL_PAGE_SIZE,
  )

  const personelDetailAllRows =
    personelDetailCard === "gelir"
      ? data.staffRevenueDetailRows
      : data.staffRows
  const personelDetailTotal = personelDetailAllRows.length
  const personelDetailTotalPages = Math.max(
    1,
    Math.ceil(personelDetailTotal / FINANSAL_DETAIL_PAGE_SIZE),
  )
  const personelDetailPageSafe = Math.min(
    Math.max(1, personelDetailPage),
    personelDetailTotalPages,
  )
  const personelOffset =
    (personelDetailPageSafe - 1) * FINANSAL_DETAIL_PAGE_SIZE
  const personelDetailPageRows = personelDetailAllRows.slice(
    personelOffset,
    personelOffset + FINANSAL_DETAIL_PAGE_SIZE,
  )

  const primDetailAllRows =
    primDetailCard === "prim_ozet"
      ? data.primRowsByService
      : data.primRowsByEmployee
  const primDetailTotal = primDetailAllRows.length
  const primDetailTotalPages = Math.max(
    1,
    Math.ceil(primDetailTotal / FINANSAL_DETAIL_PAGE_SIZE),
  )
  const primDetailPageSafe = Math.min(
    Math.max(1, primDetailPage),
    primDetailTotalPages,
  )
  const primOffset =
    (primDetailPageSafe - 1) * FINANSAL_DETAIL_PAGE_SIZE
  const primDetailPageRows = primDetailAllRows.slice(
    primOffset,
    primOffset + FINANSAL_DETAIL_PAGE_SIZE,
  )

  const seciliTarihKayitSayisi = Math.round(pieSliceValue(data.customerPie, "Seçili tarih"))
  const randevuOnaylanan = Math.round(pieSliceValue(data.appointmentPie, "Onaylanan"))
  const staffRevenuePieSum =
    Math.round(
      data.staffRevenuePie.reduce((s, x) => s + (Number(x.value) || 0), 0) * 100,
    ) / 100

  return (
    <div className="p-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as AsistanTab)}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-4 mb-6">
            <TabsList className="flex flex-wrap justify-start h-auto bg-transparent border-b border-slate-200 rounded-none p-0 gap-0 w-full lg:flex-1 lg:min-w-0">
              <TabsTrigger
                value="guncel"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 text-slate-600 px-3 pb-3 pt-2 text-sm gap-1.5"
              >
                <Briefcase className="h-4 w-4 shrink-0" />
                Güncel durum
              </TabsTrigger>
              <TabsTrigger
                value="finansal"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 text-slate-600 px-3 pb-3 pt-2 text-sm gap-1.5"
              >
                <LineChart className="h-4 w-4 shrink-0" />
                Finansal durum
              </TabsTrigger>
              <TabsTrigger
                value="musteri"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 text-slate-600 px-3 pb-3 pt-2 text-sm gap-1.5"
              >
                <Calendar className="h-4 w-4 shrink-0" />
                Müşteri ve Randevular
              </TabsTrigger>
              <TabsTrigger
                value="personel"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 text-slate-600 px-3 pb-3 pt-2 text-sm gap-1.5"
              >
                <User className="h-4 w-4 shrink-0" />
                Personel
              </TabsTrigger>
              <TabsTrigger
                value="primler"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 text-slate-600 px-3 pb-3 pt-2 text-sm gap-1.5"
              >
                <Percent className="h-4 w-4 shrink-0" />
                Primler
                <Badge variant="orange" className="ml-1 text-[10px] px-1 py-0">
                  Yeni
                </Badge>
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-row flex-nowrap items-center gap-2 shrink-0 pb-1 lg:pb-3 overflow-x-auto min-w-0 [scrollbar-width:thin]">
              {busy && (
                <span className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
                  Yükleniyor…
                </span>
              )}
              <AsistanExportButtons tab={tab} preset={preset} data={data} />

              <button
                type="button"
                title="Tarih aralığı ve KDV seçimi tüm sekmelerdeki verilere uygulanır. Gelir grafiği ödeme (tahsilat) tarihine göre satış dağılımını gösterir."
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:bg-muted"
                aria-label="Yardım"
              >
                <HelpCircle className="h-4 w-4" />
              </button>

              <Select
                value={vatMode}
                onValueChange={(v) => setVatMode(v as VatMode)}
              >
                <SelectTrigger className="h-9 w-[130px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="include">KDV&apos;li</SelectItem>
                  <SelectItem value="exclude">KDV Hariç</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={preset}
                onValueChange={(v) => setPreset(v as AsistanDatePreset)}
              >
                <SelectTrigger className="h-9 min-w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_ORDER.map((id) => (
                    <SelectItem key={id} value={id}>
                      {ASISTAN_PRESET_LABELS[id]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Güncel — tek grid: Satışlar = Randevular sütunu (1/3), Gelir = 2/3 üst sıra */}
          <TabsContent value="guncel" className="space-y-4 xl:space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-5 max-w-[min(100%,1760px)] mx-auto items-stretch">
              {/* üst sıra Sol: Gelir ile aynı satır yüksekliğinde — boşluğu kart doldursun */}
              <div className="md:col-span-1 flex min-h-0 min-w-0 flex-col md:h-full md:self-stretch md:min-h-0">
                <SatislarOzetiCard
                  totalSales={data.totalSales}
                  totalCollections={data.totalCollections}
                  remainingBalance={data.remainingBalance}
                  avgPerCustomer={data.avgPerCustomer}
                  totalDiscount={data.totalDiscount}
                />
              </div>

              <Card className={`${guncelCardShell} md:col-span-2 md:flex md:min-h-0 md:flex-col md:h-full`}>
                <CardHeader
                  className={`${guncelCardHeaderClass} flex-col sm:flex-row sm:items-start sm:justify-between gap-3`}
                >
                  <CardTitle className={`${guncelCardTitleClass} shrink-0 pt-0.5`}>Gelir Dağılımı (Satış)</CardTitle>
                  <div className="flex flex-col gap-2 text-[11px] leading-snug text-slate-600 shrink-0 w-full sm:w-auto sm:items-end">
                    <span className="flex items-center gap-2 sm:justify-end max-w-full">
                      <span className="size-2 shrink-0 rounded-full bg-[#0369a1]" aria-hidden />
                      <span className="break-words text-right font-medium">{data.barLegend.prev}</span>
                    </span>
                    <span className="flex items-center gap-2 sm:justify-end max-w-full">
                      <span
                        className="size-2 shrink-0 rounded-full bg-[#7dd3fc] ring-1 ring-slate-200/80"
                        aria-hidden
                      />
                      <span className="break-words text-right font-medium">{data.barLegend.cur}</span>
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-5 pt-4 sm:px-5 flex flex-1 flex-col min-h-0">
                  <div className="flex-1 min-h-[240px] min-w-0 w-full">
                    <GelirDagilimiSatis barData={data.barData} height={CHART_BAR_H_GUNCEL} />
                  </div>
                </CardContent>
              </Card>

              <Card className={`${guncelCardShell} md:col-span-1 min-h-[300px] xl:min-h-[min(340px,40vh)]`}>
                <CardHeader className={guncelCardHeaderClass}>
                  <CardTitle className={guncelCardTitleClass}>Randevular</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-center px-5 py-5 min-h-0">
                  <div className="mb-4">
                    <p className="text-xs font-medium text-slate-500">Toplam randevu</p>
                    <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950 tabular-nums">
                      {data.totalAppointments}
                    </p>
                  </div>
                  <PieBlock
                    appearance="guncel"
                    compact
                    spacious
                    data={data.appointmentPie}
                    valueMode="count"
                  />
                </CardContent>
              </Card>

              <Card className={`${guncelCardShell} md:col-span-1 min-h-[300px] xl:min-h-[min(340px,40vh)]`}>
                <CardHeader className={guncelCardHeaderClass}>
                  <CardTitle className={guncelCardTitleClass}>Müşteriler</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-center px-5 py-5 min-h-0">
                  <div className="mb-4">
                    <p className="text-xs font-medium text-slate-500">Toplam müşteri</p>
                    <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950 tabular-nums">
                      {data.totalCustomers}
                    </p>
                  </div>
                  <PieBlock
                    appearance="guncel"
                    compact
                    spacious
                    data={data.customerPie}
                    valueMode="count"
                  />
                </CardContent>
              </Card>

              <Card className={`${guncelCardShell} md:col-span-1 min-h-[300px] xl:min-h-[min(340px,40vh)]`}>
                <CardHeader className={guncelCardHeaderClass}>
                  <CardTitle className={guncelCardTitleClass}>Servisler</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-center px-5 py-5 min-h-0">
                  <div className="mb-4">
                    <p className="text-xs font-medium text-slate-500">Toplam servisler</p>
                    <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950 tabular-nums">
                      {data.totalAppointments}
                    </p>
                  </div>
                  <PieBlock
                    appearance="guncel"
                    compact
                    spacious
                    data={data.serviceAppointmentPie}
                    valueMode="count"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="finansal">
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5 xl:gap-5">
                <SelectableDashCard
                  selected={finansalDetailCard}
                  kind="satis"
                  onPick={pickFinansalDetailCard}
                >
                  <CardHeader className="border-b border-slate-100 px-5 py-4 pb-3">
                    <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">
                      Satışlar
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 px-5 pb-5 pt-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Toplam Satışlar</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">
                          {formatTry(data.totalSales)}
                        </p>
                      </div>
                      <div className="min-w-0 text-left sm:text-right sm:pl-4">
                        <p className="text-xs text-muted-foreground">Toplam İndirim</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">
                          {formatTry(data.totalDiscount)}
                        </p>
                      </div>
                    </div>
                    <PieBlock appearance="finansal" data={data.servicePie} valueMode="try" />
                  </CardContent>
                </SelectableDashCard>

                <SelectableDashCard
                  selected={finansalDetailCard}
                  kind="tahsilat"
                  onPick={pickFinansalDetailCard}
                >
                  <CardHeader className="border-b border-slate-100 px-5 py-4 pb-3">
                    <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">
                      Tahsilatlar
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 px-5 pb-5 pt-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Toplam tahsilatlar</p>
                      <p className="text-lg font-bold text-slate-900 tabular-nums">
                        {formatTry(data.totalCollections)}
                      </p>
                    </div>
                    <PieBlock appearance="finansal" data={data.collectionsByMethod} valueMode="try" />
                  </CardContent>
                </SelectableDashCard>

                <SelectableDashCard
                  selected={finansalDetailCard}
                  kind="alacak"
                  onPick={pickFinansalDetailCard}
                >
                  <CardHeader className="border-b border-slate-100 px-5 py-4 pb-3">
                    <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">
                      Alacaklar
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 px-5 pb-5 pt-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Toplam alacaklar</p>
                      <p className="text-lg font-bold text-slate-900 tabular-nums">
                        {formatTry(data.remainingBalance)}
                      </p>
                    </div>
                    <PieBlock appearance="finansal" data={data.receivablesPie} valueMode="try" />
                  </CardContent>
                </SelectableDashCard>

                <SelectableDashCard
                  selected={finansalDetailCard}
                  kind="servis"
                  onPick={pickFinansalDetailCard}
                >
                  <CardHeader className="border-b border-slate-100 px-5 py-4 pb-3">
                    <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">
                      Servisler
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 px-5 pb-5 pt-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Toplam servisler</p>
                      <p className="text-lg font-bold text-slate-900 tabular-nums">
                        {data.totalServiceAppointments}
                      </p>
                    </div>
                    <PieBlock appearance="finansal" data={data.serviceAppointmentPie} valueMode="count" />
                  </CardContent>
                </SelectableDashCard>

                <SelectableDashCard
                  selected={finansalDetailCard}
                  kind="gider"
                  onPick={pickFinansalDetailCard}
                >
                  <CardHeader className="border-b border-slate-100 px-5 py-4 pb-3">
                    <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">
                      Giderler
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 px-5 pb-5 pt-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Toplam giderler</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">
                          {formatTry(data.totalExpenses)}
                        </p>
                      </div>
                      <div className="min-w-0 text-left sm:text-right sm:pl-4">
                        <p className="text-xs text-muted-foreground">Gider işlemi</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">
                          {fmtCountTr(data.expenseRows.length)}
                        </p>
                      </div>
                    </div>
                    <PieBlock appearance="finansal" data={data.expensePie} valueMode="try" />
                  </CardContent>
                </SelectableDashCard>
              </div>

              <Card className="overflow-hidden border border-slate-200 shadow-sm">
                <CardContent className="p-0">
                  <div className={finansalDetailTbl.wrap}>
                    <table
                      className={`${finansalDetailTbl.table} ${
                        finansalDetailCard === "tahsilat"
                          ? "min-w-[920px]"
                          : finansalDetailCard === "gider"
                            ? "min-w-[800px]"
                            : "min-w-[860px]"
                      }`}
                    >
                      <thead>
                        <tr className={finansalDetailTbl.thead}>
                          {finansalDetailCard === "tahsilat" ? (
                            <>
                              <th className={finansalDetailTbl.th}>Ödeme tarihi</th>
                              <th className={finansalDetailTbl.th}>Ödeme tipi</th>
                              <th className={finansalDetailTbl.th}>Müşteri adı</th>
                              <th className={finansalDetailTbl.th}>Hizmet adı</th>
                              <th className={finansalDetailTbl.th}>Hizmet tipi</th>
                              <th className={`${finansalDetailTbl.th} text-right w-[11rem]`}>
                                Ödeme tutarı
                              </th>
                            </>
                          ) : finansalDetailCard === "gider" ? (
                            <>
                              <th className={finansalDetailTbl.th}>Kayıt tarihi</th>
                              <th className={finansalDetailTbl.th}>Kategori</th>
                              <th className={finansalDetailTbl.th}>Açıklama</th>
                              <th className={finansalDetailTbl.th}>Ödeme tipi</th>
                              <th className={`${finansalDetailTbl.th} text-right w-[11rem]`}>
                                Tutar
                              </th>
                            </>
                          ) : (
                            <>
                              <th className={finansalDetailTbl.th}>Randevu tarihi</th>
                              <th className={finansalDetailTbl.th}>Müşteri adı</th>
                              <th className={finansalDetailTbl.th}>Hizmet adı</th>
                              <th className={finansalDetailTbl.th}>Hizmet tipi</th>
                              <th className={`${finansalDetailTbl.th} text-right w-[11rem]`}>
                                Kalan bakiye
                              </th>
                              <th className={`${finansalDetailTbl.th} text-right w-[11rem]`}>
                                Satış tutarı
                              </th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="[&_tr:last-child]:border-b-0 min-h-[13rem]">
                        {finansalDetailTotal === 0 ? (
                          <tr>
                            <td
                              colSpan={finansalDetailCard === "gider" ? 5 : 6}
                              className={finansalDetailTbl.emptyCell}
                            >
                              {finansalDetailCard === "gider"
                                ? "Bu aralıkta gider kaydı yok"
                                : "Bu aralıkta kayıt yok"}
                            </td>
                          </tr>
                        ) : finansalDetailCard === "tahsilat" ? (
                          (finansalDetailPageRows as CollectionDetailRow[]).map((row) => (
                            <tr key={row.id} className={finansalDetailTbl.tr}>
                              <td className={finansalDetailTbl.td}>{row.date}</td>
                              <td className={finansalDetailTbl.td}>{row.methodLabel}</td>
                              <td className={`${finansalDetailTbl.td} font-medium text-slate-900`}>
                                {row.customer}
                              </td>
                              <td className={finansalDetailTbl.td}>{row.service}</td>
                              <td className={finansalDetailTbl.td}>{row.serviceType}</td>
                              <td className={`${finansalDetailTbl.tdAccent} text-right`}>
                                {formatTry(row.amount)}
                              </td>
                            </tr>
                          ))
                        ) : finansalDetailCard === "gider" ? (
                          (finansalDetailPageRows as ExpenseDetailRow[]).map((row) => (
                            <tr key={row.id} className={finansalDetailTbl.tr}>
                              <td className={finansalDetailTbl.td}>{row.date}</td>
                              <td className={`${finansalDetailTbl.td} font-medium text-slate-900`}>
                                {row.category}
                              </td>
                              <td className={finansalDetailTbl.td}>{row.description}</td>
                              <td className={finansalDetailTbl.td}>{row.methodLabel}</td>
                              <td className={`${finansalDetailTbl.tdAccent} text-right`}>
                                {formatTry(row.amount)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          (finansalDetailPageRows as FinancialRow[]).map((row) => (
                            <tr key={row.id} className={finansalDetailTbl.tr}>
                              <td className={finansalDetailTbl.td}>{row.date}</td>
                              <td className={`${finansalDetailTbl.td} font-medium text-slate-900`}>
                                {row.customer}
                              </td>
                              <td className={finansalDetailTbl.td}>{row.service}</td>
                              <td className={finansalDetailTbl.td}>{row.type}</td>
                              <td className={`${finansalDetailTbl.tdNum} text-right`}>
                                {formatTry(row.balance)}
                              </td>
                              <td className={`${finansalDetailTbl.tdAccent} text-right`}>
                                {formatTry(row.total)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <DashDetailPaginationFooter
                    busy={busy}
                    pageSafe={finansalDetailPageSafe}
                    totalPages={finansalDetailTotalPages}
                    totalRecords={finansalDetailTotal}
                    setPage={setFinansalDetailPage}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Müşteri */}
          <TabsContent value="musteri">
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 xl:gap-5">
                <SelectableDashCard
                  selected={musteriDetailCard}
                  kind="kayit"
                  onPick={pickMusteriDetailCard}
                >
                  <CardHeader className="border-b border-slate-100 px-5 py-4 pb-3">
                    <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">
                      Müşteriler
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 px-5 pb-5 pt-4">
                    <div className={kpiRowTwoColsClass}>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Toplam müşteri</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">
                          {fmtCountTr(data.totalCustomers)}
                        </p>
                      </div>
                      <div className="min-w-0 text-left sm:text-right sm:pl-4">
                        <p className="text-xs text-muted-foreground">Seçili tarih kayıt</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">
                          {fmtCountTr(seciliTarihKayitSayisi)}
                        </p>
                      </div>
                    </div>
                    <PieBlock
                      appearance="finansal"
                      data={data.customerPie}
                      valueMode="count"
                    />
                  </CardContent>
                </SelectableDashCard>

                <SelectableDashCard
                  selected={musteriDetailCard}
                  kind="cinsiyet"
                  onPick={pickMusteriDetailCard}
                >
                  <CardHeader className="border-b border-slate-100 px-5 py-4 pb-3">
                    <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">
                      Müşteri dağılımı
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 px-5 pb-5 pt-4">
                    <div className={kpiRowTwoColsClass}>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Toplam randevu</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">
                          {fmtCountTr(data.totalAppointments)}
                        </p>
                      </div>
                      <div className="min-w-0 text-left sm:text-right sm:pl-4">
                        <p className="text-xs text-muted-foreground">Liste müşterisi</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">
                          {fmtCountTr(data.customerRows.length)}
                        </p>
                      </div>
                    </div>
                    <PieBlock
                      appearance="finansal"
                      data={data.genderPie}
                      valueMode="count"
                    />
                  </CardContent>
                </SelectableDashCard>

                <SelectableDashCard
                  selected={musteriDetailCard}
                  kind="randevu"
                  onPick={pickMusteriDetailCard}
                >
                  <CardHeader className="border-b border-slate-100 px-5 py-4 pb-3">
                    <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">
                      Randevular
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 px-5 pb-5 pt-4">
                    <div className={kpiRowTwoColsClass}>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Toplam randevu</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">
                          {fmtCountTr(data.totalAppointments)}
                        </p>
                      </div>
                      <div className="min-w-0 text-left sm:text-right sm:pl-4">
                        <p className="text-xs text-muted-foreground">Onaylanan</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">
                          {fmtCountTr(randevuOnaylanan)}
                        </p>
                      </div>
                    </div>
                    <PieBlock
                      appearance="finansal"
                      data={data.appointmentPie}
                      valueMode="count"
                    />
                  </CardContent>
                </SelectableDashCard>
              </div>

              <Card className="overflow-hidden border border-slate-200 shadow-sm">
                <CardContent className="p-0">
                  <div className={finansalDetailTbl.wrap}>
                    <table
                      className={`${finansalDetailTbl.table} ${
                        musteriDetailCard === "randevu" ? "min-w-[720px]" : "min-w-[1024px]"
                      }`}
                    >
                      <thead>
                        <tr className={finansalDetailTbl.thead}>
                          {musteriDetailCard === "randevu" ? (
                            <>
                              <th className={finansalDetailTbl.th}>Randevu tarihi</th>
                              <th className={finansalDetailTbl.th}>Müşteri adı</th>
                              <th className={finansalDetailTbl.th}>Hizmet adı</th>
                              <th className={finansalDetailTbl.th}>Durum</th>
                            </>
                          ) : (
                            <>
                              <th className={finansalDetailTbl.th}>Kayıt tarihi</th>
                              <th className={finansalDetailTbl.th}>Müşteri adı</th>
                              <th className={finansalDetailTbl.th}>Cinsiyet</th>
                              <th className={`${finansalDetailTbl.th} text-center w-[7rem]`}>
                                Toplam randevu
                              </th>
                              <th className={`${finansalDetailTbl.th} text-center`}>Onaylı</th>
                              <th className={`${finansalDetailTbl.th} text-center`}>Beklemede</th>
                              <th className={`${finansalDetailTbl.th} text-center`}>Tamamlanan</th>
                              <th className={`${finansalDetailTbl.th} text-center`}>İptal</th>
                              <th className={`${finansalDetailTbl.th} text-right`}>Kalan bakiye</th>
                              <th className={`${finansalDetailTbl.th} text-right`}>
                                Dönem tahsilat
                              </th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {musteriDetailTotal === 0 ? (
                          <tr>
                            <td
                              colSpan={musteriDetailCard === "randevu" ? 4 : 10}
                              className={finansalDetailTbl.emptyCell}
                            >
                              {musteriDetailCard === "randevu"
                                ? "Bu aralıkta randevu yok"
                                : "Bu aralıkta müşteri kaydı yok"}
                            </td>
                          </tr>
                        ) : musteriDetailCard === "randevu" ? (
                          (musteriDetailPageRows as AppointmentListRow[]).map((row) => (
                            <tr key={row.id} className={finansalDetailTbl.tr}>
                              <td className={finansalDetailTbl.td}>{row.date}</td>
                              <td className={`${finansalDetailTbl.td} font-medium text-slate-900`}>
                                {row.customer}
                              </td>
                              <td className={finansalDetailTbl.td}>{row.service}</td>
                              <td className={finansalDetailTbl.td}>{row.status}</td>
                            </tr>
                          ))
                        ) : (
                          (musteriDetailPageRows as (typeof data.customerRows)[number][]).map(
                            (row) => (
                              <tr key={row.id} className={finansalDetailTbl.tr}>
                                <td className={finansalDetailTbl.td}>{row.date}</td>
                                <td className={`${finansalDetailTbl.td} font-medium text-slate-900`}>
                                  {row.name}
                                </td>
                                <td className={finansalDetailTbl.td}>{row.gender}</td>
                                <td className={`${finansalDetailTbl.tdNum} text-center`}>
                                  {row.totalApp}
                                </td>
                                <td className={`${finansalDetailTbl.tdNum} text-center`}>
                                  {row.onayApp}
                                </td>
                                <td className={`${finansalDetailTbl.tdNum} text-center`}>
                                  {row.bekApp}
                                </td>
                                <td className={`${finansalDetailTbl.tdNum} text-center`}>
                                  {row.tamApp}
                                </td>
                                <td className={`${finansalDetailTbl.tdNum} text-center`}>
                                  {row.cancelledApp}
                                </td>
                                <td className={`${finansalDetailTbl.tdNum} text-right`}>
                                  {formatTry(row.balance)}
                                </td>
                                <td className={`${finansalDetailTbl.tdAccent} text-right`}>
                                  {formatTry(row.earned)}
                                </td>
                              </tr>
                            ),
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                  <DashDetailPaginationFooter
                    busy={busy}
                    pageSafe={musteriDetailPageSafe}
                    totalPages={musteriDetailTotalPages}
                    totalRecords={musteriDetailTotal}
                    setPage={setMusteriDetailPage}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Personel */}
          <TabsContent value="personel">
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 xl:gap-5">
                <SelectableDashCard
                  selected={personelDetailCard}
                  kind="randevu_sayisi"
                  onPick={pickPersonelDetailCard}
                >
                  <CardHeader className="border-b border-slate-100 px-5 py-4 pb-3">
                    <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">
                      Randevuya göre dağılım raporu
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 px-5 pb-5 pt-4">
                    <div className={kpiRowTwoColsClass}>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Toplam çalışan</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">
                          {fmtCountTr(data.activeEmployees)}
                        </p>
                      </div>
                      <div className="min-w-0 text-left sm:text-right sm:pl-4">
                        <p className="text-xs text-muted-foreground">Dönem randevusu</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">
                          {fmtCountTr(data.totalAppointments)}
                        </p>
                      </div>
                    </div>
                    <PieBlock
                      appearance="finansal"
                      data={data.staffCountPie}
                      valueMode="count"
                    />
                  </CardContent>
                </SelectableDashCard>

                <SelectableDashCard
                  selected={personelDetailCard}
                  kind="gelir"
                  onPick={pickPersonelDetailCard}
                >
                  <CardHeader className="border-b border-slate-100 px-5 py-4 pb-3">
                    <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">
                      Gelire göre dağılım raporu
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 px-5 pb-5 pt-4">
                    <div className={kpiRowTwoColsClass}>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Toplam çalışan</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">
                          {fmtCountTr(data.activeEmployees)}
                        </p>
                      </div>
                      <div className="min-w-0 text-left sm:text-right sm:pl-4">
                        <p className="text-xs text-muted-foreground">Çalışan geliri</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">
                          {formatTry(staffRevenuePieSum)}
                        </p>
                      </div>
                    </div>
                    <PieBlock
                      appearance="finansal"
                      data={data.staffRevenuePie}
                      valueMode="try"
                    />
                  </CardContent>
                </SelectableDashCard>
              </div>

              <Card className="overflow-hidden border border-slate-200 shadow-sm">
                <CardContent className="p-0">
                  <div className={finansalDetailTbl.wrap}>
                    <table
                      className={`${finansalDetailTbl.table} ${
                        personelDetailCard === "gelir" ? "min-w-[720px]" : "min-w-[880px]"
                      }`}
                    >
                      <thead>
                        <tr className={finansalDetailTbl.thead}>
                          {personelDetailCard === "gelir" ? (
                            <>
                              <th className={finansalDetailTbl.th}>Çalışan adı</th>
                              <th className={finansalDetailTbl.th}>Hizmet adı</th>
                              <th className={`${finansalDetailTbl.th} text-right w-[11rem]`}>
                                Yapılan ödeme
                              </th>
                              <th className={`${finansalDetailTbl.th} text-right w-[11rem]`}>
                                Kalan bakiye
                              </th>
                            </>
                          ) : (
                            <>
                              <th className={finansalDetailTbl.th}>Çalışan adı</th>
                              <th className={finansalDetailTbl.th}>Hizmet adı</th>
                              <th className={`${finansalDetailTbl.th} text-center w-[5rem]`}>
                                Toplam
                              </th>
                              <th className={`${finansalDetailTbl.th} text-center`}>Onaylı</th>
                              <th className={`${finansalDetailTbl.th} text-center`}>Beklemede</th>
                              <th className={`${finansalDetailTbl.th} text-center`}>Tamamlanan</th>
                              <th className={`${finansalDetailTbl.th} text-center`}>İptal</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {personelDetailTotal === 0 ? (
                          <tr>
                            <td
                              colSpan={personelDetailCard === "gelir" ? 4 : 7}
                              className={finansalDetailTbl.emptyCell}
                            >
                              {personelDetailCard === "gelir"
                                ? "Bu aralıkta onaylı / tamamlanan satış yok"
                                : "Bu aralıkta personel randevusu yok"}
                            </td>
                          </tr>
                        ) : personelDetailCard === "gelir" ? (
                          (
                            personelDetailPageRows as (typeof data.staffRevenueDetailRows)[number][]
                          ).map((row) => (
                            <tr key={row.id} className={finansalDetailTbl.tr}>
                              <td className={`${finansalDetailTbl.td} font-medium text-slate-900`}>
                                {row.employee}
                              </td>
                              <td className={finansalDetailTbl.td}>{row.service}</td>
                              <td className={`${finansalDetailTbl.tdNum} text-right`}>
                                {formatTry(row.paid)}
                              </td>
                              <td className={`${finansalDetailTbl.tdAccent} text-right`}>
                                {formatTry(row.balance)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          (
                            personelDetailPageRows as (typeof data.staffRows)[number][]
                          ).map((row) => (
                            <tr
                              key={`${row.employee}::${row.service}`}
                              className={finansalDetailTbl.tr}
                            >
                              <td className={`${finansalDetailTbl.td} font-medium text-slate-900`}>
                                {row.employee}
                              </td>
                              <td className={finansalDetailTbl.td}>{row.service}</td>
                              <td className={`${finansalDetailTbl.tdNum} text-center`}>{row.total}</td>
                              <td className={`${finansalDetailTbl.tdNum} text-center`}>{row.onay}</td>
                              <td className={`${finansalDetailTbl.tdNum} text-center`}>{row.bek}</td>
                              <td className={`${finansalDetailTbl.tdNum} text-center`}>{row.tam}</td>
                              <td className={`${finansalDetailTbl.tdNum} text-center`}>{row.iptal}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <DashDetailPaginationFooter
                    busy={busy}
                    pageSafe={personelDetailPageSafe}
                    totalPages={personelDetailTotalPages}
                    totalRecords={personelDetailTotal}
                    setPage={setPersonelDetailPage}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Primler */}
          <TabsContent value="primler">
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:gap-5 lg:items-stretch">
                <SelectableDashCard
                  selected={primDetailCard}
                  kind="prim_ozet"
                  onPick={pickPrimDetailCard}
                  cardClassName="flex h-full min-h-0 flex-col"
                >
                  <CardHeader className="border-b border-slate-100 shrink-0 px-5 py-4 pb-3">
                    <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">
                      Hizmetlere göre dağılım raporu
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex min-h-0 flex-1 flex-col gap-3 px-5 pb-5 pt-4">
                    <div className={`${kpiRowTwoColsClass} shrink-0`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Toplam Hizmet</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">
                          {fmtCountTr(data.primDistinctServiceCount)}
                        </p>
                      </div>
                      <div className="min-w-0 text-left sm:text-right sm:pl-4">
                        <p className="text-xs text-muted-foreground">Tahmini prim</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">
                          {formatTry(data.totalPrimEstimate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col justify-center">
                      <PieBlock
                        appearance="finansal"
                        data={data.primPieByService}
                        valueMode="count"
                      />
                    </div>
                  </CardContent>
                </SelectableDashCard>

                <SelectableDashCard
                  selected={primDetailCard}
                  kind="komisyon_randevu"
                  onPick={pickPrimDetailCard}
                  cardClassName="flex h-full min-h-0 flex-col"
                >
                  <CardHeader className="border-b border-slate-100 shrink-0 px-5 py-4 pb-3">
                    <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">
                      Çalışanlara göre toplam prim tutarı
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex min-h-0 flex-1 flex-col gap-3 px-5 pb-5 pt-4">
                    <div className={`${kpiRowTwoColsClass} shrink-0`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Prim alan çalışan</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">
                          {fmtCountTr(data.primRowsByEmployee.length)}
                        </p>
                      </div>
                      <div className="min-w-0 text-left sm:text-right sm:pl-4">
                        <p className="text-xs text-muted-foreground">Tahmini prim</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">
                          {formatTry(data.totalPrimEstimate)}
                        </p>
                      </div>
                    </div>
                    <div className="-mx-1 flex min-h-[200px] flex-1 flex-col">
                      <PrimBarByEmployee series={data.primBarSeries} fillParent />
                    </div>
                  </CardContent>
                </SelectableDashCard>
              </div>

              <Card className="overflow-hidden border border-slate-200 shadow-sm">
                <CardContent className="p-0">
                  <div className={finansalDetailTbl.wrap}>
                    <table
                      className={`${finansalDetailTbl.table} min-w-[800px]`}
                    >
                      <thead>
                        <tr className={finansalDetailTbl.thead}>
                          {primDetailCard === "prim_ozet" ? (
                            <>
                              <th className={finansalDetailTbl.th}>Hizmet adı</th>
                              <th className={`${finansalDetailTbl.th} text-right`}>
                                Toplam Gelir
                              </th>
                              <th className={`${finansalDetailTbl.th} text-right`}>
                                Prim Oranı
                              </th>
                              <th className={`${finansalDetailTbl.th} text-right`}>Tutar</th>
                              <th className={finansalDetailTbl.th}>Dönem</th>
                            </>
                          ) : (
                            <>
                              <th className={finansalDetailTbl.th}>Çalışan adı</th>
                              <th className={`${finansalDetailTbl.th} text-right`}>
                                Toplam Gelir
                              </th>
                              <th className={`${finansalDetailTbl.th} text-right`}>
                                Prim Oranı
                              </th>
                              <th className={`${finansalDetailTbl.th} text-right`}>Tutar</th>
                              <th className={finansalDetailTbl.th}>Dönem</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {primDetailTotal === 0 ? (
                          <tr>
                            <td colSpan={5} className={finansalDetailTbl.emptyCell}>
                              Bu aralıkta eşleşen komisyon yok (kural ekleyin veya randevuları yenileyin)
                            </td>
                          </tr>
                        ) : primDetailCard === "prim_ozet" ? (
                          (primDetailPageRows as PrimServiceTableRow[]).map((r) => (
                            <tr key={r.service} className={finansalDetailTbl.tr}>
                              <td className={`${finansalDetailTbl.td} font-medium text-slate-900`}>
                                {r.service}
                              </td>
                              <td className={`${finansalDetailTbl.tdAccent} text-right`}>
                                {formatTry(r.totalRevenue)}
                              </td>
                              <td className={`${finansalDetailTbl.tdNum} text-right`}>
                                {fmtPctTr(r.ratePct)}
                              </td>
                              <td className={`${finansalDetailTbl.tdAccent} text-right`}>
                                {formatTry(r.primAmount)}
                              </td>
                              <td className={finansalDetailTbl.td}>{r.periodLabel}</td>
                            </tr>
                          ))
                        ) : (
                          (primDetailPageRows as PrimEmployeeTableRow[]).map((r) => (
                            <tr key={r.employee} className={finansalDetailTbl.tr}>
                              <td className={`${finansalDetailTbl.td} font-medium text-slate-900`}>
                                {r.employee}
                              </td>
                              <td className={`${finansalDetailTbl.tdAccent} text-right`}>
                                {formatTry(r.totalRevenue)}
                              </td>
                              <td className={`${finansalDetailTbl.tdNum} text-right`}>
                                {fmtPctTr(r.ratePct)}
                              </td>
                              <td className={`${finansalDetailTbl.tdAccent} text-right`}>
                                {formatTry(r.primAmount)}
                              </td>
                              <td className={finansalDetailTbl.td}>{r.periodLabel}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <DashDetailPaginationFooter
                    busy={busy}
                    pageSafe={primDetailPageSafe}
                    totalPages={primDetailTotalPages}
                    totalRecords={primDetailTotal}
                    setPage={setPrimDetailPage}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
    </div>
  )
}
