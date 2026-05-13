import { SupabaseClient } from "@supabase/supabase-js"

export type NotificationChannel = "sms" | "email" | "whatsapp"

export type CustomerPreferences = {
  sms_enabled: boolean
  email_enabled: boolean
  whatsapp_enabled: boolean
}

const DEFAULT_PREFS: CustomerPreferences = {
  sms_enabled: true,
  email_enabled: true,
  whatsapp_enabled: true,
}

export async function getCustomerPreferences(
  client: SupabaseClient,
  customerId: string,
  companyId: string
): Promise<CustomerPreferences> {
  const { data } = await client
    .from("notification_preferences")
    .select("sms_enabled, email_enabled, whatsapp_enabled")
    .eq("customer_id", customerId)
    .eq("company_id", companyId)
    .single()

  return data || DEFAULT_PREFS
}

export async function canSendNotification(
  client: SupabaseClient,
  customerId: string,
  companyId: string,
  channel: NotificationChannel
): Promise<boolean> {
  const prefs = await getCustomerPreferences(client, customerId, companyId)
  switch (channel) {
    case "sms": return prefs.sms_enabled
    case "email": return prefs.email_enabled
    case "whatsapp": return prefs.whatsapp_enabled
    default: return true
  }
}

export async function updateCustomerPreferences(
  client: SupabaseClient,
  customerId: string,
  companyId: string,
  updates: Partial<CustomerPreferences>
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await client
    .from("notification_preferences")
    .upsert(
      {
        customer_id: customerId,
        company_id: companyId,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "customer_id,company_id" }
    )

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function optOutAll(
  client: SupabaseClient,
  customerId: string,
  companyId: string
): Promise<{ ok: boolean }> {
  const result = await updateCustomerPreferences(client, customerId, companyId, {
    sms_enabled: false,
    email_enabled: false,
    whatsapp_enabled: false,
  })
  return { ok: result.ok }
}
