import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          phone: string | null
          email: string | null
          address: string | null
          currency: string
          language: string
          timezone: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          email?: string | null
          currency?: string
          language?: string
          timezone?: string
        }
        Update: {
          name?: string
          phone?: string | null
          email?: string | null
          currency?: string
          language?: string
          timezone?: string
        }
      }
      profiles: {
        Row: {
          id: string
          company_id: string
          full_name: string
          phone: string | null
          email: string | null
          role: string
          created_at: string
        }
        Insert: {
          id: string
          company_id: string
          full_name: string
          phone?: string | null
          email?: string | null
          role?: string
        }
        Update: {
          full_name?: string
          phone?: string | null
          email?: string | null
          role?: string
        }
      }
      employees: {
        Row: {
          id: string
          company_id: string
          full_name: string
          phone: string
          email: string
          status: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          full_name: string
          phone: string
          email: string
          status?: string
          color?: string
        }
        Update: {
          full_name?: string
          phone?: string
          email?: string
          status?: string
          color?: string
        }
      }
      appointments: {
        Row: {
          id: string
          company_id: string
          customer_id: string
          service_id: string
          employee_id: string
          appointment_date: string
          start_time: string
          end_time: string
          price: number | null
          discount: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          customer_id: string
          service_id: string
          employee_id: string
          appointment_date: string
          start_time: string
          end_time: string
          price?: number | null
          discount?: number
          status?: string
        }
        Update: {
          status?: string
          price?: number | null
          discount?: number
        }
      }
      customers: {
        Row: {
          id: string
          company_id: string
          full_name: string
          phone: string
          email: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          full_name: string
          phone: string
          email?: string | null
        }
        Update: {
          full_name?: string
          phone?: string
          email?: string | null
        }
      }
      services: {
        Row: {
          id: string
          company_id: string
          name: string
          duration_hours: number
          duration_minutes: number
          vat_rate: number
          price: number
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          duration_hours?: number
          duration_minutes?: number
          vat_rate?: number
          price: number
        }
        Update: {
          name?: string
          price?: number
          vat_rate?: number
        }
      }
    }
  }
}
