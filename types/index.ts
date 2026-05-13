export interface Company {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  location?: string
  authorized_person?: string
  founded_date?: string
  website?: string
  owner_tckn?: string
  tax_number?: string
  tax_office?: string
  billing_address?: string
  currency: string
  service_type?: string
  language: string
  timezone: string
  logo_url?: string
  created_at: string
}

export interface Profile {
  id: string
  company_id: string
  full_name: string
  phone?: string
  email?: string
  role: 'owner' | 'manager' | 'employee'
  language: string
  sms_notifications: boolean
  email_notifications: boolean
  whatsapp_notifications: boolean
  created_at: string
}

export interface Employee {
  id: string
  company_id: string
  full_name: string
  phone: string
  email: string
  birth_date?: string
  gender?: string
  language: string
  start_date?: string
  status: 'active' | 'inactive'
  sms_notifications: boolean
  email_notifications: boolean
  whatsapp_notifications: boolean
  color: string
  created_at: string
}

export interface ServiceLocation {
  id: string
  company_id: string
  name: string
  description?: string
  created_at: string
  employees?: Employee[]
}

export interface Service {
  id: string
  company_id: string
  name: string
  duration_hours: number
  duration_minutes: number
  vat_rate: number
  price: number
  location_id?: string
  employee_id?: string
  online_available: boolean
  show_price: boolean
  created_at: string
  location?: ServiceLocation
  employee?: Employee
}

export interface Package {
  id: string
  company_id: string
  name: string
  usage_period?: string
  description?: string
  price: number
  created_at: string
  package_services?: PackageService[]
}

export interface PackageService {
  id: string
  package_id: string
  service_id: string
  sessions: number
  price?: number
  service?: Service
}

export interface Customer {
  id: string
  company_id: string
  full_name: string
  phone: string
  email?: string
  birth_date?: string
  gender?: string
  language: string
  tckn?: string
  city?: string
  district?: string
  address?: string
  sms_consent: boolean
  email_consent: boolean
  whatsapp_consent: boolean
  created_at: string
}

export interface DynamicField {
  id: string
  company_id: string
  name: string
  field_type: 'text' | 'radio' | 'checkbox' | 'select'
  options?: string[]
  created_at: string
}

export interface Appointment {
  id: string
  company_id: string
  customer_id: string
  service_id: string
  employee_id: string
  location_id?: string
  appointment_date: string
  start_time: string
  end_time: string
  price?: number
  discount: number
  status: 'pending' | 'approved' | 'cancelled' | 'completed'
  recurrence: string
  notes?: string
  created_at: string
  customer?: Customer
  service?: Service
  employee?: Employee
  location?: ServiceLocation
}

export interface ClassSession {
  id: string
  company_id: string
  name: string
  service_id: string
  location_id?: string
  start_date: string
  duration_hours?: number
  duration_minutes?: number
  recurrence?: string
  end_date?: string
  employee_id: string
  capacity: number
  notes?: string
  created_at: string
  service?: Service
  location?: ServiceLocation
  employee?: Employee
  customers?: Customer[]
}

export interface Payment {
  id: string
  company_id: string
  customer_id: string
  appointment_id?: string
  amount: number
  payment_method?: string
  payment_date: string
  created_at: string
  customer?: Customer
  appointment?: Appointment
}

export interface WorkingHours {
  id: string
  company_id: string
  employee_id?: string
  day_of_week: number
  start_time: string
  end_time: string
  is_working: boolean
}

export interface EmployeeLeave {
  id: string
  employee_id: string
  start_date: string
  end_date: string
  start_time?: string
  end_time?: string
  created_at: string
}

export interface CommissionRule {
  id: string
  company_id: string
  name: string
  applies_to?: string
  employee_id?: string
  service_id?: string
  commission_rate: number
  scope: string
  status: 'active' | 'inactive'
  created_at: string
  employee?: Employee
  service?: Service
}

export interface SmsPackage {
  id: string
  company_id: string
  name: string
  total_sms?: number
  used_sms: number
  purchase_date: string
}

export interface TargetAudience {
  id: string
  company_id: string
  name: string
  filters?: Record<string, unknown>
  created_at: string
}

export interface Campaign {
  id: string
  company_id: string
  title: string
  target_audience_id?: string
  start_date?: string
  end_date?: string
  channel: string
  content?: string
  status: 'draft' | 'active' | 'completed'
  created_at: string
  target_audience?: TargetAudience
}

export interface Settings {
  id: string
  company_id: string
  appointment_reminder_time: string
  payment_reminder_time: string
  sms_package_usage_percentage: number
  sms_package_reminder: boolean
  notification_masking: boolean
  notification_mask_length?: number
  credit_reminder_time: string
  package_reminder_time: string
  package_usage_percentage: number
  attendance_method: string
  attendance_approval_deadline: string
  attendance_reminder_time: string
  accepted_attendance_sms: boolean
  accepted_attendance_email: boolean
  rejected_attendance_sms: boolean
  rejected_attendance_email: boolean
}
