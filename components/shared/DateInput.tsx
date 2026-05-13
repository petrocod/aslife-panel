"use client"

import { useEffect, useMemo, useState } from "react"
import { DayPicker } from "react-day-picker"
import { tr } from "date-fns/locale"
import { format, parse, isValid, startOfDay } from "date-fns"
import { Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import "react-day-picker/dist/style.css"

interface DateInputProps {
  value: string
  onChange: (v: string) => void
  className?: string
  placeholder?: string
  min?: string
  max?: string
  disablePast?: boolean
  /**
   * dropdown: yalnızca ay + yıl açılır listeleri (hızlı geçmiş/yıl)
   * dropdown-buttons: listeler + ay okları
   */
  captionLayout?: "buttons" | "dropdown" | "dropdown-buttons"
  fromYear?: number
  toYear?: number
  confirmSelection?: boolean
  confirmLabel?: string
  accent?: "default" | "warm"
  /** Üst başlık + ikon; yalnızca dolu ise gösterilir */
  popoverTitle?: string
}

export function DateInput({
  value,
  onChange,
  className,
  placeholder = "Tarih seçin",
  min,
  max,
  disablePast = false,
  captionLayout = "dropdown-buttons",
  fromYear: fromYearProp,
  toYear: toYearProp,
  confirmSelection = false,
  confirmLabel = "Onayla",
  accent = "default",
  popoverTitle,
}: DateInputProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Date | undefined>(undefined)

  const cy = new Date().getFullYear()
  const fromYear = fromYearProp ?? cy - 120
  const toYear = toYearProp ?? cy + 25

  const selected = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined
  const isValidDate = Boolean(selected && isValid(selected))
  const selectedDate = isValidDate ? selected! : undefined

  const dateBounds = useMemo(() => {
    const todayStart = startOfDay(new Date())
    const parsedMin = min ? parse(min, "yyyy-MM-dd", new Date()) : undefined
    const parsedMax = max ? parse(max, "yyyy-MM-dd", new Date()) : undefined

    let effFrom = parsedMin
    if (disablePast) {
      if (!effFrom || effFrom.getTime() < todayStart.getTime()) effFrom = todayStart
    }

    return {
      from: effFrom,
      to: parsedMax,
      disabledMatchers: disablePast ? ({ before: todayStart } as const) : undefined,
    }
  }, [min, max, disablePast])

  const fromDate = dateBounds.from ?? new Date(fromYear, 0, 1)
  const toDate = dateBounds.to ?? new Date(toYear, 11, 31)

  const effectiveCaption =
    captionLayout === "dropdown" || captionLayout === "dropdown-buttons"
      ? captionLayout
      : "buttons"

  const pureDropdown = effectiveCaption === "dropdown"
  const warm = accent === "warm"
  const showPanelHeader = Boolean(popoverTitle?.trim())

  useEffect(() => {
    if (!open || !confirmSelection) return
    const d = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined
    setDraft(d && isValid(d) ? d : undefined)
  }, [open, confirmSelection, value])

  function handleDaySelect(day: Date | undefined) {
    if (!day) return
    if (confirmSelection) {
      setDraft(day)
      return
    }
    onChange(format(day, "yyyy-MM-dd"))
    setOpen(false)
  }

  function applyConfirm() {
    if (draft) onChange(format(draft, "yyyy-MM-dd"))
    setOpen(false)
  }

  const pickerSelected = confirmSelection ? draft : selectedDate
  const defaultMonth = pickerSelected ?? selectedDate ?? fromDate

  const navBtn =
    "h-7 w-7 bg-transparent p-0 border border-slate-200 rounded-md flex items-center justify-center opacity-70 hover:opacity-100"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center w-full border border-slate-200 rounded-md h-9 px-3 bg-white cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm",
            open && "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30",
            warm && "focus:ring-amber-500 focus:border-amber-500",
            warm && open && "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40",
            !isValidDate && "text-slate-400",
            className
          )}
        >
          <span className="flex-1 text-left text-slate-700">
            {isValidDate ? format(selectedDate!, "dd/MM/yyyy") : placeholder}
          </span>
          <Calendar className={cn("h-4 w-4 shrink-0 ml-1", warm ? "text-amber-600" : "text-slate-400")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-auto max-w-[min(100vw-2rem,20rem)] p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-lg",
          warm && "border-amber-100"
        )}
        align="start"
      >
        {showPanelHeader && (
          <div
            className={cn(
              "px-4 pt-3 pb-2 flex items-center justify-between gap-2",
              warm && "bg-amber-50/50"
            )}
          >
            <span className="text-sm font-semibold text-slate-800">{popoverTitle}</span>
            <Calendar className={cn("h-5 w-5 shrink-0", warm ? "text-amber-600" : "text-slate-500")} />
          </div>
        )}
        <div className={cn("px-2 pb-2", !showPanelHeader && "pt-2")}>
          <DayPicker
            mode="single"
            selected={pickerSelected}
            onSelect={handleDaySelect}
            locale={tr}
            fromDate={fromDate}
            toDate={toDate}
            fromYear={fromYear}
            toYear={toYear}
            disabled={dateBounds.disabledMatchers}
            captionLayout={effectiveCaption}
            defaultMonth={defaultMonth}
            showOutsideDays
            weekStartsOn={0}
            modifiers={{
              sunday: (d) => d.getDay() === 0,
            }}
            modifiersClassNames={{
              sunday: warm
                ? "!text-amber-600 font-medium"
                : "!text-amber-600/90 font-medium",
            }}
            className={cn("p-2 pt-0")}
            classNames={{
              months: "flex flex-col",
              month: "space-y-2",
              caption: cn(
                "flex justify-center pt-1 pb-1 relative items-center gap-1",
                !pureDropdown && "min-h-[2rem]"
              ),
              caption_label: pureDropdown ? "sr-only" : "text-sm font-medium",
              caption_dropdowns: cn(
                "flex w-full items-center justify-center gap-2 px-1 [&_select]:text-sm [&_select]:rounded-lg [&_select]:border [&_select]:border-slate-200 [&_select]:bg-white [&_select]:py-1.5 [&_select]:pl-2 [&_select]:pr-8",
                warm && "[&_select]:border-amber-200"
              ),
              dropdown: cn("text-sm", warm && "text-slate-800"),
              dropdown_month: "",
              dropdown_year: "",
              nav: pureDropdown ? "hidden" : "space-x-1 flex items-center",
              nav_button: pureDropdown ? "hidden" : navBtn,
              nav_button_previous: pureDropdown ? "hidden" : "absolute left-1",
              nav_button_next: pureDropdown ? "hidden" : "absolute right-1",
              table: "w-full border-collapse",
              head_row: "flex mb-1",
              head_cell: cn(
                "w-9 font-semibold text-[10px] uppercase tracking-wide text-center",
                warm ? "text-amber-600" : "text-slate-500"
              ),
              row: "flex w-full mt-0.5",
              cell: "h-9 w-9 text-center text-sm p-0 relative",
              day: cn(
                "h-9 w-9 p-0 font-normal text-sm rounded-lg flex items-center justify-center text-slate-800",
                "hover:bg-slate-100",
                warm && "hover:bg-amber-50"
              ),
              day_selected: warm
                ? "!bg-transparent !text-slate-900 font-semibold underline decoration-2 decoration-amber-600 underline-offset-2 hover:!bg-transparent"
                : "!bg-blue-600 !text-white hover:!bg-blue-600 rounded-lg",
              day_today: cn("font-semibold", warm ? "bg-amber-100/80 text-amber-950" : "bg-slate-100"),
              day_outside: "text-slate-300 opacity-70",
              day_disabled: "text-slate-300 opacity-40",
            }}
          />
        </div>
        {confirmSelection && (
          <div className={cn("px-3 pb-3 pt-1", warm && "bg-amber-50/40")}>
            <Button
              type="button"
              className={cn(
                "w-full rounded-xl font-medium",
                warm && "bg-amber-600 hover:bg-amber-700 text-white"
              )}
              disabled={!draft}
              onClick={applyConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
