/** Asistan sekmesi — Navbar başlığı, URL (?tab=) ve dashboard verisi ortak kullanır */

export type AsistanTab = "guncel" | "finansal" | "musteri" | "personel" | "primler"

const IDS: readonly AsistanTab[] = ["guncel", "finansal", "musteri", "personel", "primler"] as const

export function isAsistanTab(value: string | null | undefined): value is AsistanTab {
  return value != null && (IDS as readonly string[]).includes(value)
}

export function normalizeAsistanTab(value: string | null | undefined): AsistanTab {
  return isAsistanTab(value) ? value : "guncel"
}

export const ASISTAN_TAB_COPY: Record<
  AsistanTab,
  { title: string; desc: string }
> = {
  guncel: {
    title: "Güncel durum",
    desc: "Güncel durum raporunuzu görüntüleyebilirsiniz.",
  },
  finansal: {
    title: "Finansal durum",
    desc: "Finansal durum raporunuzu görüntüleyebilirsiniz.",
  },
  musteri: {
    title: "Müşteri ve Randevular",
    desc: "Müşteri ve randevu raporunuzu görüntüleyebilirsiniz.",
  },
  personel: {
    title: "Personel",
    desc: "Personel raporunuzu görüntüleyebilirsiniz.",
  },
  primler: {
    title: "Primler",
    desc: "Prim raporlarınızı buradan görüntüleyebilirsiniz.",
  },
}
