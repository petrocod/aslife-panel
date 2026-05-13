-- STEP 1: Add calendar_token to employees & customers
-- Run this FIRST in Supabase SQL Editor

ALTER TABLE employees ADD COLUMN IF NOT EXISTS calendar_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS calendar_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;
UPDATE employees SET calendar_token = gen_random_uuid()::text WHERE calendar_token IS NULL;
UPDATE customers SET calendar_token = gen_random_uuid()::text WHERE calendar_token IS NULL;
