"use client"

import { useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CHANNEL_FILTER_OPTIONS, CATEGORY_OPTIONS, NOTIFICATION_TEMPLATES } from "@/lib/musteri-bildirimleri"
import type { NotifCategory } from "@/lib/musteri-bildirimleri"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Filter, Mail, MessageCircle, MoreVertical, Pencil, Search, ChevronDown, ChevronUp } from "lucide-react"

type ChannelFilterId = (typeof CHANNEL_FILTER_OPTIONS)[number]["id"]

const channelPill: Record<string, { className: string; icon: typeof Mail }> = {
  "e-Mail": { className: "bg-blue-500", icon: Mail },
  SMS: { className: "bg-orange-500", icon: MessageCircle },
  Whatsapp: { className: "bg-green-600", icon: MessageCircle },
}

export default function MusteriBildirimleriPage() {
  const [search, setSearch] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [selCat, setSelCat] = useState<Set<NotifCategory>>(new Set())
  const [selChan, setSelChan] = useState<Set<ChannelFilterId>>(new Set())
  const [catOpen, setCatOpen] = useState(true)
  const [chanOpen, setChanOpen] = useState(true)
  const [catSearch, setCatSearch] = useState("")
  const [chanSearch, setChanSearch] = useState("")

  const activeCount = selCat.size + selChan.size

  const catVisible = useMemo(
    () =>
      CATEGORY_OPTIONS.filter((c) => c.label.toLowerCase().includes(catSearch.toLowerCase().trim())),
    [catSearch]
  )
  const chanVisible = useMemo(
    () =>
      CHANNEL_FILTER_OPTIONS.filter((c) => c.label.toLowerCase().includes(chanSearch.toLowerCase().trim())),
    [chanSearch]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return NOTIFICATION_TEMPLATES.filter((n) => {
      if (q && !n.title.toLowerCase().includes(q)) return false
      if (selCat.size > 0 && !selCat.has(n.category)) return false
      if (selChan.size > 0) {
        const allSelectedMatch = Array.from(selChan).every((id) => {
          const m = CHANNEL_FILTER_OPTIONS.find((c) => c.id === id)?.match
          return m ? n.channels.includes(m as "e-Mail" | "SMS" | "Whatsapp") : false
        })
        if (!allSelectedMatch) return false
      }
      return true
    })
  }, [search, selCat, selChan])

  /** Kanal filtresi açıkken kartta yalnızca seçilen kanal(lar)ın etiketleri gösterilir. */
  const activeChannelLabels = useMemo(() => {
    if (selChan.size === 0) return null
    return new Set(
      Array.from(selChan)
        .map((id) => CHANNEL_FILTER_OPTIONS.find((c) => c.id === id)?.match)
        .filter(Boolean) as string[],
    )
  }, [selChan])

  function toggleCat(id: NotifCategory) {
    setSelCat((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function toggleChan(id: ChannelFilterId) {
    setSelChan((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  return (
    <div className="flex min-h-0">
      {filterOpen && (
        <aside
          className="w-[280px] shrink-0 border-r border-slate-200 bg-white p-4 overflow-y-auto max-h-[calc(100vh-8rem)]"
          aria-label="Filtreler"
        >
          <div>
            <h2 className="text-base font-semibold text-slate-900">Filtreler</h2>
            <p className="text-xs text-slate-500 mt-0.5">Uygun filtreyi seç ve devam et</p>
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={() => setCatOpen((o) => !o)}
              className="flex w-full items-center justify-between text-left text-sm font-medium text-slate-800"
            >
              <span>Kategori ({CATEGORY_OPTIONS.length})</span>
              {catOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
            </button>
            {catOpen && (
              <div className="mt-2 space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={catSearch}
                    onChange={(e) => setCatSearch(e.target.value)}
                    placeholder="Ara"
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                  {catVisible.map((c) => (
                    <li key={c.id}>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-slate-300"
                          checked={selCat.has(c.id)}
                          onChange={() => toggleCat(c.id)}
                        />
                        {c.label}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setChanOpen((o) => !o)}
              className="flex w-full items-center justify-between text-left text-sm font-medium text-slate-800"
            >
              <span>Kanal ({CHANNEL_FILTER_OPTIONS.length})</span>
              {chanOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
            </button>
            {chanOpen && (
              <div className="mt-2 space-y-2">
                <p className="text-[11px] leading-snug text-slate-500">
                  Birden fazla kanal seçilirse <span className="font-medium text-slate-600">hepsini birden</span> destekleyen
                  şablonlar listelenir. Kartta yalnızca seçtiğiniz kanal etiketleri gösterilir.
                </p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={chanSearch}
                    onChange={(e) => setChanSearch(e.target.value)}
                    placeholder="Ara"
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                <ul className="space-y-1.5">
                  {chanVisible.map((c) => (
                    <li key={c.id}>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-slate-300"
                          checked={selChan.has(c.id)}
                          onChange={() => toggleChan(c.id)}
                        />
                        {c.label}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      )}

      <div className={cn("min-w-0 flex-1 p-6 max-w-none", filterOpen && "min-w-0")}>
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Button
            type="button"
            size="icon"
            onClick={() => setFilterOpen((o) => !o)}
            className={cn(
              "relative h-9 w-9 shrink-0",
              filterOpen
                ? "bg-blue-600 text-white hover:bg-blue-600"
                : "border border-slate-200 bg-blue-600 text-white hover:bg-blue-700"
            )}
            aria-pressed={filterOpen}
            aria-label="Filtreler"
          >
            <Filter className="h-4 w-4" />
            {activeCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-semibold leading-none text-white">
                {activeCount}
              </span>
            )}
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            Kanal Ayarları
          </Button>
          <div className="relative flex-1 min-w-[160px] max-w-md ml-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Ara"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
          {filtered.map((notif) => {
            const displayChannels = activeChannelLabels
              ? notif.channels.filter((ch) => activeChannelLabels.has(ch))
              : notif.channels
            return (
              <div
                key={notif.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-md shadow-slate-200/50 ring-1 ring-slate-900/5 flex flex-col"
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800 line-clamp-2">{notif.title}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Menü"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/ayarlar/musteri-bildirimleri/${notif.id}`}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <Pencil className="h-4 w-4" />
                          Düzenle
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="bg-slate-50 rounded-lg border border-slate-100 p-3 min-h-[100px] max-h-[200px] overflow-y-auto text-xs text-left">
                    <p className="font-semibold text-slate-800 text-sm leading-snug">{notif.preview}</p>
                    {notif.fields && (
                      <div className="mt-2 space-y-1 w-full">
                        {notif.fields.reduce((acc: ReactNode[], field, i) => {
                          if (i % 2 === 0) {
                            acc.push(
                              <div key={i} className="flex items-center gap-1 text-xs text-slate-500">
                                <div className="w-2 h-2 rounded-sm border border-sky-500 shrink-0" aria-hidden />
                                <span>{field}</span>
                                {notif.fields && notif.fields[i + 1] && (
                                  <span className="text-slate-700 font-medium">{notif.fields[i + 1]}</span>
                                )}
                              </div>
                            )
                          }
                          return acc
                        }, [])}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {displayChannels.map((ch) => {
                      const p = channelPill[ch] ?? { className: "bg-slate-500", icon: MessageCircle }
                      const Icon = p.icon
                      return (
                        <span
                          key={ch}
                          className={cn(
                            "inline-flex items-center gap-1 text-white text-[10px] font-medium px-2.5 py-0.5 rounded-full",
                            p.className,
                          )}
                        >
                          <Icon className="h-3 w-3 opacity-90 shrink-0" />
                          {ch}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <button type="button">{"<"}</button>
            <span>1</span>
            <button type="button">{">"}</button>
          </div>
          <span>
            Toplam kayıt: {filtered.length} / {NOTIFICATION_TEMPLATES.length} adet
          </span>
          <div className="flex items-center gap-1">
            <span>Sayfa başına:</span>
            <select className="border rounded px-1 py-0.5 text-xs" defaultValue="12" aria-label="Sayfa boyutu">
              <option value="12">12</option>
              <option value="24">24</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
