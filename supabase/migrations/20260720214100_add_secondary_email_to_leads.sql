-- Migration: Add secondary_email to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS secondary_email TEXT;
