-- Add missing expiry_date column to public.companies table
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS expiry_date date;
