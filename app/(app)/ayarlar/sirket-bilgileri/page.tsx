"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Building2,
  Calendar,
  Edit2,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  User,
  Wallet,
  FileText,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { loadCompanyBestEffort } from "@/lib/company-db"
import { useCompany } from "@/hooks/useCompany"
import { useSubscription } from "@/hooks/useSubscription"
import { CompanyRegisterForm } from "@/components/settings/CompanyRegisterForm"
import { cn } from "@/lib/utils"

type CompanyRow = {
  name: string
  phone: string | null
  email: string | null
  address: string | null
  location: string | null
  authorized: string | null
  founded_at: string | null
  website: string | null
  tc_no: string | null
  tax_number: string | null
  tax_office: string | null
  invoice_address: string | null
  currency: string
  service_type: string | null
  language: string
  timezone: string
  logo_url: string | null
}

const CURRENCY_LABEL: Record<string, string> = {
  TRY: "Türk Lirası",
  USD: "ABD Doları",
  EUR: "Euro",
}

const LANG_LABEL: Record<string, string> = {
  tr: "Türkçe",
  en: "English",
}

function dash(v: string | null | undefined) {
  if (v == null || String(v).trim() === "") return "-"
  return String(v)
}

function formatDate(d: string | null) {
  if (!d) return "-"
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return d
  }
}

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-slate-100 last:border-0">
      <Icon className="h-5 w-5 shrink-0 text-slate-400 mt-0.5" aria-hidden />
      <div className="w-[min(13rem,40%)] shrink-0 text-sm text-slate-500">{label}</div>
      <div className="min-w-0 flex-1 text-sm text-slate-800 break-words">{value}</div>
    </div>
  )
}

export default function SirketBilgileriPage() {
  const { companyId, loading: authLoading, userId, refetch: refetchCompany } = useCompany()
  const sub = useSubscription()
  const [company, setCompany] = useState<CompanyRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchDetail, setFetchDetail] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return

    if (!companyId) {
      setCompany(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        setFetchDetail(null)
        const { data, error } = await loadCompanyBestEffort(supabase, companyId)
        if (cancelled) return
        setCompany(data ? (data as CompanyRow) : null)
        setFetchDetail(error)
      } catch {
        if (!cancelled) {
          setCompany(null)
          setFetchDetail("Bağlantı hatası")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [companyId, authLoading])

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-900/5">
        {loading || authLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : !company ? (
          <div className="py-10 text-center text-sm text-slate-600">
            {!userId ? (
              <>
                <p>Şirket bilgileri oturum gerektirir.</p>
                <p className="mt-2 text-xs text-slate-500">
                  Giriş yaptıktan sonra şirket kaydınız oturumunuzla yüklenecektir.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/login">Giriş yap</Link>
                </Button>
              </>
            ) : !companyId ? (
              <div className="py-2 max-w-3xl mx-auto">
                <p className="text-sm text-slate-600 mb-4">
                  Giriş yaptınız; şirket kaydınızı burada oluşturun. Kayıttan sonra bilgileri istediğiniz zaman{" "}
                  <Link href="/ayarlar/sirket-bilgileri/duzenle" className="text-blue-600 font-medium hover:underline">
                    düzenleyebilirsiniz
                  </Link>
                  .
                </p>
                <CompanyRegisterForm onSuccess={() => void refetchCompany()} />
              </div>
            ) : (
              <>
                <p>Bu şirket kaydı görüntülenemedi veya bulunamadı.</p>
                {fetchDetail && (
                  <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-left max-w-xl mx-auto">
                    {fetchDetail}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  Şirket kaydınız yüklenemedi. Lütfen destek ile iletişime geçin.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {userId && companyId && !sub.loading && (
              <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-slate-100">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Abonelik</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800">
                  {sub.planName}
                </span>
                {sub.status === "trialing" && sub.trialDaysLeft !== null && (
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-900">
                    Deneme: {sub.trialDaysLeft > 0 ? `${sub.trialDaysLeft} gün kaldı` : "süresi doldu"}
                  </span>
                )}
                <Link
                  href="/hesabim/plan-sec"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline ml-auto"
                >
                  Planı değiştir
                </Link>
              </div>
            )}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-2">
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <div
                    className={cn(
                      "h-20 w-20 sm:h-24 sm:w-24 rounded-full border-2 border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center"
                    )}
                  >
                    {company.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={company.logo_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-slate-400 text-3xl font-bold">
                        {company.name?.[0]?.toLocaleUpperCase("tr-TR") || "?"}
                      </span>
                    )}
                  </div>
                  <Link
                    href="/ayarlar/sirket-bilgileri/duzenle#logo"
                    className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md ring-2 ring-white transition hover:bg-emerald-600"
                    title="Logo ekle veya değiştir"
                  >
                    <Plus className="h-5 w-5" strokeWidth={2.5} />
                  </Link>
                </div>
                <div className="min-w-0 pt-1">
                  <h2 className="text-xl font-bold text-slate-800">{dash(company.name)}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {dash(company.phone)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {dash(company.email)}
                    </span>
                    {company.website ? (
                      <a
                        href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        {company.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5" />-
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Link href="/ayarlar/sirket-bilgileri/duzenle">
                <Button className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                  <Edit2 className="h-4 w-4" />
                  Düzenle
                </Button>
              </Link>
            </div>

            <div className="mt-4 pt-2">
              <InfoRow icon={Building2} label="Şirket ünvanı" value={dash(company.name)} />
              <InfoRow icon={Phone} label="Telefon numarası" value={dash(company.phone)} />
              <InfoRow icon={Mail} label="E-posta adresi" value={dash(company.email)} />
              <InfoRow icon={MapPin} label="Şirket adresi" value={dash(company.address)} />
              <InfoRow icon={MapPin} label="Firma konumu" value={dash(company.location)} />
              <InfoRow icon={User} label="Yetkili kişi" value={dash(company.authorized)} />
              <InfoRow icon={Calendar} label="Kuruluş tarihi" value={formatDate(company.founded_at)} />
              <InfoRow icon={Globe} label="Web sitesi" value={dash(company.website)} />
              <InfoRow icon={FileText} label="İş yeri sahibi TCKN" value={dash(company.tc_no)} />
              <InfoRow icon={FileText} label="Vergi numarası" value={dash(company.tax_number)} />
              <InfoRow icon={Building2} label="Vergi dairesi" value={dash(company.tax_office)} />
              <InfoRow icon={MapPin} label="Fatura adresi" value={dash(company.invoice_address)} />
              <InfoRow
                icon={Wallet}
                label="Para birimi"
                value={CURRENCY_LABEL[company.currency] ?? dash(company.currency)}
              />
              <InfoRow icon={Building2} label="Hizmet türü" value={dash(company.service_type)} />
              <InfoRow
                icon={Globe}
                label="Dil seçeneği"
                value={LANG_LABEL[company.language] ?? dash(company.language)}
              />
              <InfoRow icon={Globe} label="Zaman dilimi" value={dash(company.timezone)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
