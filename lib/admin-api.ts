import { getSupabaseAdmin } from "@/lib/supabase-admin"

export { getSupabaseAdmin }

const admin = () => getSupabaseAdmin()

export async function getOrganizations() {
  const { data, error } = await admin().from("organizations").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function getCompanies() {
  const { data, error } = await admin().from("companies").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function getProfiles() {
  const { data, error } = await admin().from("profiles").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function getSupportTickets() {
  const { data, error } = await admin().from("support_tickets").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function getAdminUsers() {
  const { data, error } = await admin().from("admin_users").select("*")
  if (error) throw error
  return data
}
