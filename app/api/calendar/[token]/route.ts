import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

function icsEscape(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function toIcsDateTimeLocal(dateStr: string, timeStr: string): string {
  const d = dateStr.replace(/-/g, '')
  const t = timeStr.replace(/:/g, '').slice(0, 6)
  return `${d}T${t}`
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token
  if (!token || token.length < 10) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  const { data: emp } = await supabase
    .from('employees')
    .select('id, company_id, full_name')
    .eq('calendar_token', token)
    .maybeSingle()

  const { data: cust } = !emp
    ? await supabase
        .from('customers')
        .select('id, company_id, full_name')
        .eq('calendar_token', token)
        .maybeSingle()
    : { data: null }

  const owner = emp || cust
  if (!owner) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  }

  const isEmployee = !!emp
  const filterCol = isEmployee ? 'employee_id' : 'customer_id'

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const minDate = thirtyDaysAgo.toISOString().slice(0, 10)

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, appointment_date, start_time, end_time, status, notes, customers(full_name), services(name), employees(full_name), service_locations(name)')
    .eq('company_id', owner.company_id)
    .eq(filterCol, owner.id)
    .gte('appointment_date', minDate)
    .order('appointment_date', { ascending: true })

  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', owner.company_id)
    .single()

  const companyName = company?.name || 'aSistan'

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//aSistan//${companyName}//TR`,
    `X-WR-CALNAME:${icsEscape(companyName)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const a of appointments || []) {
    const custName = (a as any).customers?.full_name || ''
    const svcName = (a as any).services?.name || ''
    const empName = (a as any).employees?.full_name || ''
    const locName = (a as any).service_locations?.name || ''

    const summary = isEmployee
      ? `${custName} – ${svcName}`
      : `${svcName} (${empName})`

    const desc = [
      svcName && `Hizmet: ${svcName}`,
      empName && `Çalışan: ${empName}`,
      custName && `Müşteri: ${custName}`,
      locName && `Konum: ${locName}`,
      a.notes && `Not: ${a.notes}`,
    ].filter(Boolean).join('\\n')

    const dtStart = toIcsDateTimeLocal(a.appointment_date, a.start_time)
    const dtEnd = toIcsDateTimeLocal(a.appointment_date, a.end_time)

    ics.push(
      'BEGIN:VEVENT',
      `UID:${a.id}@asistan`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${icsEscape(summary)}`,
      `DESCRIPTION:${icsEscape(desc)}`,
      locName ? `LOCATION:${icsEscape(locName)}` : '',
      `STATUS:${a.status === 'iptal' || a.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT',
    )
  }

  ics.push('END:VCALENDAR')

  const body = ics.filter(Boolean).join('\r\n')

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="${token}.ics"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
