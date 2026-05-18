import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { format, parseISO } from "date-fns"
import { tr } from "date-fns/locale"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ token: string }> }

export default async function CustomerPortalPage({ params }: Props) {
  const { token } = await params
  const supabase = getSupabaseAdmin()

  const { data: customer } = await supabase
    .from("customers")
    .select("id, full_name, company_id, companies(name)")
    .eq("portal_token", token)
    .maybeSingle()

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <p className="text-slate-600 text-center">Geçersiz veya süresi dolmuş bağlantı.</p>
      </div>
    )
  }

  const companyName =
    (customer.companies as { name?: string } | null)?.name ?? "İşletme"

  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "appointment_date, start_time, end_time, status, services(name), employees(full_name)"
    )
    .eq("customer_id", customer.id)
    .order("appointment_date", { ascending: false })
    .limit(50)

  const fmtDate = (d: string) => {
    try {
      return format(parseISO(d), "dd MMMM yyyy", { locale: tr })
    } catch {
      return d
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs text-slate-500 uppercase tracking-wide">{companyName}</p>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Randevu geçmişim
          </h1>
          <p className="text-sm text-slate-600 mt-1">{customer.full_name}</p>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-6">
        {!appointments?.length ? (
          <p className="text-sm text-slate-500 text-center py-12">
            Henüz kayıtlı randevu bulunmuyor.
          </p>
        ) : (
          <ul className="space-y-3">
            {appointments.map((a, i) => (
              <li
                key={`${a.appointment_date}-${a.start_time}-${i}`}
                className="bg-white rounded-xl border border-slate-200 p-4"
              >
                <p className="font-medium text-slate-900">
                  {fmtDate(a.appointment_date)} · {a.start_time?.slice(0, 5)}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {(a.services as { name?: string } | null)?.name ?? "Hizmet"}
                  {(a.employees as { full_name?: string } | null)?.full_name &&
                    ` · ${(a.employees as { full_name: string }).full_name}`}
                </p>
                <p className="text-xs text-slate-400 mt-2 capitalize">{a.status}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="text-center text-xs text-slate-400 mt-8">aSistan</p>
      </main>
    </div>
  )
}
