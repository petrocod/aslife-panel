"use client"

import * as React from "react"
import { Pipette } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const PRESET_COLORS = [
  // Satürasyonlu, تقویم / اپراتورها برای تمایز
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#76ec36", "#22c55e", "#10b981",
  "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#2563eb", "#4f46e5", "#6366f1", "#8b5cf6",
  "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#64748b", "#475569", "#1e3a5f", "#0f172a",
]

function parseHex(s: string): { r: number; g: number; b: number } | null {
  const t = s.trim().replace("#", "")
  if (t.length === 3) {
    const r = parseInt(t[0] + t[0], 16)
    const g = parseInt(t[1] + t[1], 16)
    const b = parseInt(t[2] + t[2], 16)
    if ([r, g, b].some((n) => Number.isNaN(n))) return null
    return { r, g, b }
  }
  if (t.length === 6) {
    const r = parseInt(t.slice(0, 2), 16)
    const g = parseInt(t.slice(2, 4), 16)
    const b = parseInt(t.slice(4, 6), 16)
    if ([r, g, b].some((n) => Number.isNaN(n))) return null
    return { r, g, b }
  }
  return null
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((x) => Math.max(0, Math.min(255, Math.round(x))))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")
    .toLowerCase()}`
}

function normalizeHex(v: string): string | null {
  const p = parseHex(v)
  if (!p) return null
  return rgbToHex(p.r, p.g, p.b)
}

type ColorPickerFieldProps = {
  value: string
  onChange: (hex: string) => void
  id?: string
  label?: string
  className?: string
}

export function ColorPickerField({
  value,
  onChange,
  id = "renk",
  label = "Renk",
  className,
}: ColorPickerFieldProps) {
  const [open, setOpen] = React.useState(false)
  const [hexDraft, setHexDraft] = React.useState(value)
  const [r, setR] = React.useState(0)
  const [g, setG] = React.useState(0)
  const [b, setB] = React.useState(0)
  const nativeRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setHexDraft(value)
    const p = parseHex(value)
    if (p) {
      setR(p.r)
      setG(p.g)
      setB(p.b)
    }
  }, [value])

  function applyColor(hex: string) {
    const n = normalizeHex(hex)
    if (n) onChange(n)
  }

  function syncFromRgb(nR: number, nG: number, nB: number) {
    setR(nR)
    setG(nG)
    setB(nB)
    applyColor(rgbToHex(nR, nG, nB))
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={id} className="text-sm text-slate-600 font-medium">
          {label}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            className="flex w-full max-w-sm items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:border-slate-300"
          >
            <span
              className="h-9 w-9 shrink-0 rounded-md border border-slate-200 shadow-sm"
              style={{ backgroundColor: value || "#3b82f6" }}
            />
            <span className="font-mono text-slate-700">{value || "#3b82f6"}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-3" align="start">
          <p className="text-xs font-semibold text-slate-700 mb-2">Palet</p>
          <div className="grid grid-cols-8 gap-1.5 mb-3">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => {
                  applyColor(c)
                  setHexDraft(c)
                }}
                className={cn(
                  "h-6 w-6 rounded border transition hover:scale-110",
                  (normalizeHex(value) || value.toLowerCase()) === c
                    ? "ring-2 ring-blue-500 ring-offset-1 border-slate-400"
                    : "border-slate-200"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 mb-2">
            <div
              className="h-8 w-8 shrink-0 rounded-full border border-slate-200"
              style={{ backgroundColor: value }}
            />
            <div className="flex-1 flex items-center gap-1.5 min-w-0">
              <Pipette className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                ref={nativeRef}
                type="color"
                value={normalizeHex(value) || "#3b82f6"}
                onChange={(e) => {
                  applyColor(e.target.value)
                  setHexDraft(e.target.value)
                }}
                className="h-8 flex-1 min-w-0 cursor-pointer rounded border-0 p-0 bg-transparent"
                aria-label="Renk seç"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-[10px] text-slate-500">Hex</span>
              <Input
                className="mt-0.5 h-8 font-mono text-xs"
                value={hexDraft}
                onChange={(e) => setHexDraft(e.target.value)}
                onBlur={() => {
                  const n = normalizeHex(hexDraft)
                  if (n) {
                    applyColor(n)
                    setHexDraft(n)
                  } else {
                    setHexDraft(value)
                  }
                }}
                maxLength={7}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { k: "R" as const, v: r, set: setR },
                { k: "G" as const, v: g, set: setG },
                { k: "B" as const, v: b, set: setB },
              ].map(({ k, v, set }) => (
                <div key={k}>
                  <span className="text-[10px] text-slate-500">{k}</span>
                  <Input
                    type="number"
                    min={0}
                    max={255}
                    className="mt-0.5 h-8 text-center text-xs"
                    value={v}
                    onChange={(e) => {
                      const n = Math.max(0, Math.min(255, Number(e.target.value) || 0))
                      if (k === "R") syncFromRgb(n, g, b)
                      if (k === "G") syncFromRgb(r, n, b)
                      if (k === "B") syncFromRgb(r, g, n)
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
