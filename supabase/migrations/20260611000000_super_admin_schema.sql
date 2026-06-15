-- 1. Enable Required Extensions
create extension if not exists "uuid-ossp";

-- 2. Create Reusable Trigger function for Updated At
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- 3. Create Subscription Plans Table (UUID-based PK)
create table if not exists public.subscription_plans (
    id uuid default gen_random_uuid() primary key,
    name text unique not null,
    price numeric(10, 2) not null,
    projects text not null,
    users text not null,
    storage text not null,
    features jsonb not null,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

drop trigger if exists set_updated_at_subscription_plans on public.subscription_plans;
create trigger set_updated_at_subscription_plans
    before update on public.subscription_plans
    for each row execute procedure public.update_updated_at_column();

-- 4. Clean up and Align Companies Table (subscription_plan_id references plans.id)
alter table public.companies drop column if exists subscription_plan;
alter table public.companies add column if not exists subscription_plan_id uuid references public.subscription_plans(id) on delete set null;
alter table public.companies add column if not exists created_by uuid;
alter table public.companies add column if not exists updated_by uuid;

drop trigger if exists set_updated_at_companies on public.companies;
create trigger set_updated_at_companies
    before update on public.companies
    for each row execute procedure public.update_updated_at_column();

-- 5. Expand Audit Logs Table
create table if not exists public.audit_logs (
    id uuid default gen_random_uuid() primary key,
    actor_id uuid,
    actor_email text,
    action text not null, -- e.g. COMPANY_CREATED, PLAN_CREATED, USER_DELETED
    entity_type text,     -- e.g. COMPANY, USER, PLAN
    entity_id uuid,
    metadata jsonb,
    timestamp timestamp with time zone default now() not null
);

-- 6. Align Users Profile Table (linked to auth.users)
alter table public.users add column if not exists full_name text;

drop trigger if exists set_updated_at_users on public.users;
create trigger set_updated_at_users
    before update on public.users
    for each row execute procedure public.update_updated_at_column();

-- 7. Trigger Function to sync Auth Users metadata with public.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, role, company_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'CONTRACTOR_OWNER'::public.user_role),
    case 
      when new.raw_user_meta_data->>'company_id' is not null then (new.raw_user_meta_data->>'company_id')::uuid
      else null
    end
  );
  return new;
end;
$$ language plpgsql security definer;

-- Bind Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 8. Super Admin Verification Function
create or replace function public.is_super_admin(user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.users
    where id = user_id and role = 'SUPER_ADMIN'
  );
$$ language sql security definer;

-- 9. Row Level Security (RLS) Configuration
alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.audit_logs enable row level security;

-- Drop obsolete policies
drop policy if exists "Super Admin full control on companies" on public.companies;
drop policy if exists "Users can read own company" on public.companies;
drop policy if exists "Contractor Owners can update own company" on public.companies;
drop policy if exists "Allow public inserts to companies" on public.companies;
drop policy if exists "Super Admin full control on users" on public.users;
drop policy if exists "Users can read same company profiles" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Anyone can select plans" on public.subscription_plans;
drop policy if exists "Super Admin full control on plans" on public.subscription_plans;
drop policy if exists "Super Admin can view audit logs" on public.audit_logs;
drop policy if exists "Authenticated users can insert audit logs" on public.audit_logs;

-- Companies Policies
create policy "Super Admin full control on companies" on public.companies for all using (public.is_super_admin(auth.uid()));
create policy "Users can read own company" on public.companies for select using (id = (select company_id from public.users where id = auth.uid()));
create policy "Contractor Owners can update own company" on public.companies for update using (
  id = (select company_id from public.users where id = auth.uid())
  and (select role from public.users where id = auth.uid()) = 'CONTRACTOR_OWNER'
);
-- NOTE: Public inserts are disabled. Companies are created only via secure Super Admin route handlers.

-- Users Policies
create policy "Super Admin full control on users" on public.users for all using (public.is_super_admin(auth.uid()));
create policy "Users can read same company profiles" on public.users for select using (company_id = (select company_id from public.users where id = auth.uid()));
create policy "Users can update own profile" on public.users for update using (id = auth.uid());

-- Subscription Plans Policies
create policy "Anyone can select plans" on public.subscription_plans for select using (true);
create policy "Super Admin full control on plans" on public.subscription_plans for all using (public.is_super_admin(auth.uid()));

-- Audit Logs Policies
create policy "Super Admin can view audit logs" on public.audit_logs for select using (public.is_super_admin(auth.uid()));
create policy "Authenticated users can insert audit logs" on public.audit_logs for insert with check (auth.role() = 'authenticated');

-- 10. Performance Indexes
create index if not exists idx_users_company_id on public.users(company_id);
create index if not exists idx_users_role on public.users(role);
create index if not exists idx_companies_status on public.companies(status);
create index if not exists idx_companies_subscription_plan_id on public.companies(subscription_plan_id);
create index if not exists idx_audit_logs_timestamp on public.audit_logs(timestamp desc);
create index if not exists idx_audit_logs_action on public.audit_logs(action);

-- Indexes for future multi-tenant operations
create index if not exists idx_projects_company_id on public.projects(company_id);
create index if not exists idx_suppliers_company_id on public.suppliers(company_id);
create index if not exists idx_materials_project_id on public.materials(project_id);
create index if not exists idx_expenses_project_id on public.expenses(project_id);
create index if not exists idx_client_payments_project_id on public.client_payments(project_id);
create index if not exists idx_supplier_payments_project_id on public.supplier_payments(project_id);

-- 11. Seeding Data
-- Seed Core Subscriptions
insert into public.subscription_plans (name, price, projects, users, storage, features)
values 
  ('Starter', 49.00, '3', '2', '5 GB', '{"Accounting": false, "Materials": true, "Expenses": true, "Reports": false, "Documents": true, "AI": false}'),
  ('Professional', 149.00, '20', '5', '25 GB', '{"Accounting": true, "Materials": true, "Expenses": true, "Reports": true, "Documents": true, "AI": false}'),
  ('Business', 299.00, 'Unlimited', 'Unlimited', '100 GB', '{"Accounting": true, "Materials": true, "Expenses": true, "Reports": true, "Documents": true, "AI": true}')
on conflict (name) do nothing;
