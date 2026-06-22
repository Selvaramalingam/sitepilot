-- Migration: Clean up subscription plan features JSONB (Remove fake Documents/AI, add Tasks/Finance)
-- Date: 2026-06-22

-- Update features JSONB column of default plans
UPDATE public.subscription_plans
SET features = '{"Accounting": false, "Materials": true, "Expenses": true, "Reports": false, "Tasks": true, "Finance": false}'::jsonb
WHERE name = 'Starter';

UPDATE public.subscription_plans
SET features = '{"Accounting": true, "Materials": true, "Expenses": true, "Reports": true, "Tasks": true, "Finance": true}'::jsonb
WHERE name = 'Professional';

UPDATE public.subscription_plans
SET features = '{"Accounting": true, "Materials": true, "Expenses": true, "Reports": true, "Tasks": true, "Finance": true}'::jsonb
WHERE name = 'Business';

-- Clean up any custom/other plans to only contain the 6 real active feature modules
UPDATE public.subscription_plans
SET features = jsonb_build_object(
  'Accounting', COALESCE((features->>'Accounting')::boolean, false),
  'Materials', COALESCE((features->>'Materials')::boolean, true),
  'Expenses', COALESCE((features->>'Expenses')::boolean, true),
  'Reports', COALESCE((features->>'Reports')::boolean, false),
  'Tasks', COALESCE((features->>'Tasks')::boolean, true),
  'Finance', COALESCE((features->>'Finance')::boolean, false)
)
WHERE name NOT IN ('Starter', 'Professional', 'Business');
