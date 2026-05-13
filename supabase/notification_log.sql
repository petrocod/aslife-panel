-- Notification log: tracks every notification dispatch across all channels
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  template_key TEXT NOT NULL,
  sms_sent BOOLEAN DEFAULT FALSE,
  email_sent BOOLEAN DEFAULT FALSE,
  whatsapp_sent BOOLEAN DEFAULT FALSE,
  sms_error TEXT,
  email_error TEXT,
  whatsapp_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_company ON notification_log(company_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_customer ON notification_log(customer_id, template_key);
CREATE INDEX IF NOT EXISTS idx_notification_log_created ON notification_log(created_at);

-- Add per-channel toggle columns to notification_templates if they don't exist
DO $$ BEGIN
  ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT TRUE;
  ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT TRUE;
  ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT TRUE;
EXCEPTION WHEN undefined_table THEN
  -- notification_templates table doesn't exist yet, create it
  CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    template_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    whatsapp_enabled BOOLEAN DEFAULT TRUE,
    custom_sms TEXT,
    custom_email TEXT,
    custom_whatsapp TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, template_key)
  );
END $$;
