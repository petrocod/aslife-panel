export type NotifCategory = "sistem" | "musteri" | "kullanici" | "yonetici" | "ozel"

export const CATEGORY_OPTIONS: { id: NotifCategory; label: string }[] = [
  { id: "sistem", label: "Sistem" },
  { id: "musteri", label: "Müşteri" },
  { id: "kullanici", label: "Kullanıcı" },
  { id: "yonetici", label: "Yönetici" },
  { id: "ozel", label: "Özel" },
]

export const CHANNEL_FILTER_OPTIONS: { id: "sms" | "email" | "whatsapp"; label: string; match: string }[] = [
  { id: "sms", label: "SMS", match: "SMS" },
  { id: "email", label: "Email", match: "e-Mail" },
  { id: "whatsapp", label: "WhatsApp", match: "Whatsapp" },
]

export type ChannelLabel = "e-Mail" | "SMS" | "Whatsapp"

export type EmailPreviewLayout = "standard" | "participation"
export type WhatsappPreviewKind = "default" | "attendance"

export type CustomerNotificationTemplate = {
  id: string
  title: string
  preview: string
  fields?: string[]
  channels: ChannelLabel[]
  category: NotifCategory
  defaultEmail: string
  defaultSms: string
  defaultWhatsapp: string
  /** e-posta sağdaki canlı önizleme düzeni (katılım = bilgi kutüleri + CTA) */
  emailPreviewLayout?: EmailPreviewLayout
  /** WhatsApp: katılım şablonunda alt düğmeler (Katılacağım / Katılmayacağım) */
  whatsappPreview?: WhatsappPreviewKind
}

/** Örnek değerler: canlı metinde {{ $... }} ifadeleri buna dönüştürülür */
/** Önizlemede sabit marka adı yerine işletme değişkenleri kullanılır. */
export const SAMPLE_PLACEHOLDERS: Record<string, string> = {
  sitedomain: "isletme-ornek.com",
  company_company_name: "Örnek İşletme",
  company_email: "noreply@isletme-ornek.com",
  company_fullphone: "+90 555 555 55 55",
  company_address: "İstanbul, Türkiye",
  company_website: "https://isletme-ornek.com",
  company_location_url: "https://maps.google.com",
  /** Boş: önizlemede şirket adının baş harfi kullanılır; gerçek gönderimde doldurulur. */
  company_logo_url: "",
  customer_name: "Ayşe Yılmaz",
  payment_title: "Ödeme #1024",
  service_title: "Manuel Terapi",
  appointment_starting_at_date: "19 Ocak 2024",
  appointment_starting_at_time: "13:00",
  redirection_url: "https://app.isletme-ornek.com/r/katilim/...",
}

export const TEMPLATE_VARIABLES: { key: string; label: string }[] = [
  { key: "{{ $sitedomain }}", label: "Site Domain" },
  { key: "{{ $company_company_name }}", label: "Şirket Adı" },
  { key: "{{ $company_logo_url }}", label: "Şirket logosu (URL)" },
  { key: "{{ $company_email }}", label: "Şirket E-posta" },
  { key: "{{ $company_fullphone }}", label: "Şirket Telefonu" },
  { key: "{{ $company_address }}", label: "Şirket Adresi" },
  { key: "{{ $company_website }}", label: "Şirket Web Sitesi" },
  { key: "{{ $company_location_url }}", label: "Şirket Konum Linki" },
  { key: "{{ $customer_name }}", label: "Müşteri adı" },
  { key: "{{ $payment_title }}", label: "Ödeme başlığı" },
  { key: "{{ $service_title }}", label: "Hizmet adı" },
  { key: "{{ $appointment_starting_at_date }}", label: "Randevu tarihi" },
  { key: "{{ $appointment_starting_at_time }}", label: "Randevu saati" },
  { key: "{{ $redirection_url }}", label: "Katılım bağlantısı" },
]

/** companies satırından şablon değişkenleri (önizleme); boş alanlar örnek değerde kalır. */
export function buildCompanyPlaceholderOverrides(
  row: Record<string, unknown> | null | undefined,
): Record<string, string> {
  if (!row) return {}

  try {
  const pick = (k: string): string | undefined => {
    const v = row[k]
    if (v == null) return undefined
    const s = String(v).trim()
    return s === "" ? undefined : s
  }

  const out: Record<string, string> = {}

  const name = pick("name")
  if (name) out.company_company_name = name

  const email = pick("email")
  if (email) out.company_email = email

  const phone = pick("phone")
  if (phone) out.company_fullphone = phone

  const address = pick("address")
  if (address) out.company_address = address

  let website = pick("website")
  if (website) {
    if (!/^https?:\/\//i.test(website)) website = `https://${website}`
    out.company_website = website
    try {
      const host = new URL(website).hostname.replace(/^www\./i, "")
      if (host) out.sitedomain = host
    } catch {
      const host = website.replace(/^https?:\/\//i, "").split("/")[0]?.replace(/^www\./i, "")
      if (host) out.sitedomain = host
    }
  }

  const location = pick("location")
  if (location) {
    out.company_location_url = /^https?:\/\//i.test(location)
      ? location
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
  }

  const logo = pick("logo_url")
  if (logo) out.company_logo_url = logo

  return out
  } catch {
    return {}
  }
}

export function applyTemplatePreview(source: string, overrides?: Record<string, string>): string {
  const src = typeof source === "string" ? source : source == null ? "" : String(source)
  const map: Record<string, string> = { ...SAMPLE_PLACEHOLDERS, ...overrides }
  return src.replace(/\{\{\s*\$?([a-z0-9_]+)\s*\}\}/gi, (_, key: string) => {
    const k = key.toLowerCase()
    if (map[k] !== undefined) return map[k]!
    return `[${key}]`
  })
}

const STORAGE_KEY = (id: string) => `musteri-bildirim-template:${id}`

export type TemplateEditorState = {
  email: string
  sms: string
  whatsapp: string
  emailEnabled: boolean
  smsEnabled: boolean
  whatsappEnabled: boolean
}

export function defaultEditorState(t: CustomerNotificationTemplate): TemplateEditorState {
  return {
    email: t.defaultEmail,
    sms: t.defaultSms,
    whatsapp: t.defaultWhatsapp,
    emailEnabled: t.channels.includes("e-Mail"),
    smsEnabled: t.channels.includes("SMS"),
    whatsappEnabled: t.channels.includes("Whatsapp"),
  }
}

export function loadEditorState(
  t: CustomerNotificationTemplate
): TemplateEditorState {
  if (typeof window === "undefined") return defaultEditorState(t)
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY(t.id))
    if (!raw) return defaultEditorState(t)
    const p = JSON.parse(raw) as Partial<TemplateEditorState>
    return {
      email: typeof p.email === "string" ? p.email : t.defaultEmail,
      sms: typeof p.sms === "string" ? p.sms : t.defaultSms,
      whatsapp: typeof p.whatsapp === "string" ? p.whatsapp : t.defaultWhatsapp,
      emailEnabled: typeof p.emailEnabled === "boolean" ? p.emailEnabled : t.channels.includes("e-Mail"),
      smsEnabled: typeof p.smsEnabled === "boolean" ? p.smsEnabled : t.channels.includes("SMS"),
      whatsappEnabled: typeof p.whatsappEnabled === "boolean" ? p.whatsappEnabled : t.channels.includes("Whatsapp"),
    }
  } catch {
    return defaultEditorState(t)
  }
}

export function saveEditorState(t: CustomerNotificationTemplate, s: TemplateEditorState): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY(t.id), JSON.stringify(s))
  } catch {
    // ignore
  }
}

const NOTIFICATION_TEMPLATES: CustomerNotificationTemplate[] = [
  {
    id: "yeni-musteri",
    title: "Yeni Müşteri",
    category: "musteri",
    channels: ["e-Mail", "SMS", "Whatsapp"],
    preview:
      "Teşekkürler! Ayşe Yılmaz, bizi tercih ettiğiniz için teşekkür ederiz. Bildirim almak istemiyorsanız +90 555 555 55 55 nolu telefondan bize ulaşabilirsiniz.",
    defaultEmail: `{{ $customer_name }}\nTeşekkürler!\n{{ $customer_name }}, bizi tercih ettiğiniz için teşekkür ederiz.\nBildirim almak istemiyorsanız {{ $company_fullphone }} nolu telefondan bize ulaşabilirsiniz.\n\n{{ $company_company_name }}`,
    defaultSms: `Teşekkürler! {{ $customer_name }}, bizi tercih ettiğiniz için teşekkür ederiz. Çıkmak için {{ $company_fullphone }}.`,
    defaultWhatsapp: `Hoş geldiniz! {{ $customer_name }}\n\n{{ $customer_name }}, {{ $company_fullphone }} — randevu hatırlatmaları ve güncellemeler bu hattan iletilecektir.\n\n_ Mesaj almak istemiyorsanız "DUR" yazınız. _`,
  },
  {
    id: "randevu-onayi",
    title: "Randevu Onayı",
    category: "sistem",
    channels: ["e-Mail", "SMS", "Whatsapp"],
    fields: ["Hizmet adı", "Manuel Terapi"],
    preview: "Randevunuz oluşturuldu",
    defaultEmail: `{{ $customer_name }}\nRandevu Onayı\nRandevunuz oluşturuldu. Hizmet: Manuel Terapi.\n{{ $company_company_name }}\n{{ $company_fullphone }}`,
    defaultSms: "Randevunuz oluşturuldu, {{ $customer_name }}. Manuel Terapi. {{ $company_fullphone }}",
    defaultWhatsapp: `Merhaba {{ $customer_name }}, randevunuz onaylandı. Manuel Terapi. Detay: {{ $company_fullphone }}`,
  },
  {
    id: "randevu-iptali",
    title: "Randevu İptali",
    category: "sistem",
    channels: ["e-Mail", "SMS", "Whatsapp"],
    fields: ["Hizmet adı", "Manuel Terapi", "Randevu saati ve tarihi", "Hizmet Yeri"],
    preview: "Randevunuz iptal edildi",
    defaultEmail: `{{ $customer_name }}\nİptal Bildirimi\nRandevunuz iptal edildi. {{ $company_fullphone }}\n{{ $company_company_name }}`,
    defaultSms: "Randevunuz iptal edildi, {{ $customer_name }}. {{ $company_fullphone }}",
    defaultWhatsapp: `{{ $customer_name }}, randevunuz iptal edildi. Bize: {{ $company_fullphone }}`,
  },
  {
    id: "randevu-hatiratici",
    title: "Randevu Hatırlatıcı",
    category: "sistem",
    channels: ["e-Mail", "SMS", "Whatsapp"],
    fields: ["Hizmet adı", "Manuel Terapi"],
    preview: "Randevu hatırlatma",
    defaultEmail: `{{ $customer_name }}\nHatırlatma\nYaklaşan randevunuz var: Manuel Terapi. {{ $company_fullphone }}\n{{ $company_company_name }}`,
    defaultSms: "Hatırlatma: {{ $customer_name }}, randevu yaklaşıyor. {{ $company_fullphone }}",
    defaultWhatsapp: `{{ $customer_name }} — randevu hatırlatması. Manuel Terapi. {{ $company_fullphone }}`,
  },
  {
    id: "randevu-guncelleme",
    title: "Randevu Güncelleme",
    category: "sistem",
    channels: ["e-Mail", "SMS", "Whatsapp"],
    fields: ["Hizmet adı", "Manuel Terapi", "Randevu saati ve tarihi", "Hizmet Yeri"],
    preview: "Randevunuz Güncellendi",
    defaultEmail: `{{ $customer_name }}\nGüncelleme\nRandevunuz güncellendi. {{ $company_fullphone }}\n{{ $company_company_name }}`,
    defaultSms: "Randevunuz güncellendi, {{ $customer_name }}. {{ $company_fullphone }}",
    defaultWhatsapp: `{{ $customer_name }}, randevu bilgileriniz güncellendi. {{ $company_fullphone }}`,
  },
  {
    id: "randevu-katilim",
    title: "Randevu Katılım",
    category: "sistem",
    channels: ["e-Mail", "SMS", "Whatsapp"],
    fields: ["Hizmet adı", "Manuel Terapi", "Randevu saati ve tarihi", "13:00 - 19 Ocak 2024"],
    preview: "Katılım durumunu bildirmeniz bekleniyor (Manuel Terapi).",
    emailPreviewLayout: "participation",
    whatsappPreview: "attendance",
    defaultEmail: `Katılım durumunu bildirir misin?

Aşağıdaki {{ $service_title }} dersi için yeriniz ayrılmıştır. Lütfen katılım durumunuzu belirtin.`,
    defaultSms: `{{ $appointment_starting_at_date }} {{ $appointment_starting_at_time }} 'deki {{ $company_company_name }} {{ $service_title }} randevunuza katılacaksanız, lütfen aşağıdaki bağlantıya tıklayarak katılım durumunuzu belirtin. {{ $redirection_url }}`,
    defaultWhatsapp: `*Randevu Katılımınızı Belirtiniz!*

Merhaba {{ $customer_name }},

*{{ $company_company_name }}* randevu bilgileriniz aşağıdaki gibidir.

*Hizmet:* {{ $service_title }}
*Tarih/Saat:* {{ $appointment_starting_at_time }} - {{ $appointment_starting_at_date }}
*Konum:* {{ $company_location_url }}

Randevunuza katılacaksanız, lütfen aşağıdaki düğmelerden biriyle katılım durumunuzu belirtin.

Bilgi/değişiklik için: {{ $company_fullphone }}

_ Mesaj almak istemiyorsanız "DUR" yazınız. _`,
  },
  {
    id: "kredi-bitis",
    title: "Kredi Bitiş",
    category: "musteri",
    channels: ["e-Mail", "SMS", "Whatsapp"],
    fields: ["Kredi Hizmeti", "Manuel Terapi"],
    preview: "Kredinizin Süresi Dolmak Üzere",
    defaultEmail: `{{ $customer_name }}\nKredi\nKredinizin süresi dolmak üzere. Manuel Terapi. {{ $company_fullphone }}\n{{ $company_company_name }}`,
    defaultSms: "Krediniz bitiyor, {{ $customer_name }}. {{ $company_fullphone }}",
    defaultWhatsapp: `{{ $customer_name }}, kredi süreniz bitiyor. {{ $company_fullphone }}`,
  },
  {
    id: "kredi-kullanimi",
    title: "Kredi Kullanımı",
    category: "musteri",
    channels: ["e-Mail", "SMS", "Whatsapp"],
    fields: ["Kredi Hizmeti", "Manuel Terapi"],
    preview: "Kredi Paketinizdeki Son Krediler!",
    defaultEmail: `{{ $customer_name }}\nKredi Kullanımı\nKredi paketinizde kalan son krediler. {{ $company_fullphone }}\n{{ $company_company_name }}`,
    defaultSms: "Kredi: {{ $customer_name }}, kalan krediniz sınırlı. {{ $company_fullphone }}",
    defaultWhatsapp: `{{ $customer_name }} — kredi durumu. {{ $company_fullphone }}`,
  },
  {
    id: "paket-bitis-hatiratici",
    title: "Paket Bitiş Hatırlatıcı",
    category: "musteri",
    channels: ["e-Mail", "SMS", "Whatsapp"],
    fields: ["Paket", "Fizyoterapi Paketi"],
    preview: "Paket'inizin bitiş tarihi yaklaşıyor!",
    defaultEmail: `{{ $customer_name }}\nPaket\nPaket bitiş tarihine yaklaştınız. Fizyoterapi Paketi. {{ $company_fullphone }}\n{{ $company_company_name }}`,
    defaultSms: "Paketiniz bitiyor, {{ $customer_name }}. {{ $company_fullphone }}",
    defaultWhatsapp: `{{ $customer_name }} — paket bitişi yaklaşıyor. {{ $company_fullphone }}`,
  },
  {
    id: "paket-kullanimi",
    title: "Paket Kullanımı",
    category: "musteri",
    channels: ["e-Mail", "SMS", "Whatsapp"],
    fields: ["Paket Başlığı", "Fizyoterapi Paketi"],
    preview: "Paket Kullanım Bildirimi",
    defaultEmail: `{{ $customer_name }}\nPaket Kullanımı\nPaket kullanım bildirimi. Fizyoterapi. {{ $company_fullphone }}\n{{ $company_company_name }}`,
    defaultSms: "Paket kullanım: {{ $customer_name }}. {{ $company_fullphone }}",
    defaultWhatsapp: `{{ $customer_name }} — paket kullanım. {{ $company_fullphone }}`,
  },
  {
    id: "musteri-odeme-hatiratici",
    title: "Müşteri Ödeme Hatırlatıcı",
    category: "musteri",
    channels: ["e-Mail", "SMS", "Whatsapp"],
    fields: ["Ödeme Başlığı", "{{ $payment_title }}"],
    preview: "Ödeme Hatırlatma",
    defaultEmail: `{{ $customer_name }}\nÖdeme\nÖdeme hatırlatması. {{ $payment_title }}. {{ $company_fullphone }}\n{{ $company_company_name }}`,
    defaultSms: "Ödeme: {{ $customer_name }}, {{ $payment_title }}. {{ $company_fullphone }}",
    defaultWhatsapp: `{{ $customer_name }} — {{ $payment_title }} ödeme hatırlatması. {{ $company_fullphone }}`,
  },
]

export { NOTIFICATION_TEMPLATES }

/** useParams().id bazen string[] (Next sürümleri) veya boşluk/Unicode farkı olabilir. */
export function getTemplateById(
  rawId: string | string[] | null | undefined
): CustomerNotificationTemplate | undefined {
  if (rawId == null) return undefined
  const first = Array.isArray(rawId) ? rawId[0] : rawId
  if (typeof first !== "string") return undefined
  const id = first.trim().normalize("NFC")
  if (!id) return undefined
  return NOTIFICATION_TEMPLATES.find((t) => t.id === id)
}
