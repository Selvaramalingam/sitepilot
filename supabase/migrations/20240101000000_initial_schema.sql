-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Companies Table
create table if not exists public.companies (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    owner_email text not null,
    phone text,
    address text,
    subscription_plan text default 'Starter'::text,
    status text default 'Active'::text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Users Table (Custom profiles linking to auth.users)
create type user_role as enum ('SUPER_ADMIN', 'CONTRACTOR_OWNER', 'SITE_ENGINEER');

create table if not exists public.users (
    id uuid references auth.users on delete cascade primary key,
    company_id uuid references public.companies on delete cascade,
    email text not null,
    first_name text,
    last_name text,
    role user_role not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Projects Table
create table if not exists public.projects (
    id uuid default uuid_generate_v4() primary key,
    company_id uuid references public.companies on delete cascade not null,
    name text not null,
    client_name text,
    address text,
    start_date date,
    end_date date,
    status text default 'Planning'::text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Project Assignments (for Site Engineers)
create table if not exists public.project_assignments (
    id uuid default uuid_generate_v4() primary key,
    project_id uuid references public.projects on delete cascade not null,
    user_id uuid references public.users on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Materials Table
create table if not exists public.materials (
    id uuid default uuid_generate_v4() primary key,
    project_id uuid references public.projects on delete cascade not null,
    name text not null,
    quantity numeric(10, 2) not null,
    unit text not null,
    supplier_id uuid, -- Will reference suppliers table
    cost numeric(12, 2) not null,
    bill_url text,
    purchase_date date not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Expenses Table
create table if not exists public.expenses (
    id uuid default uuid_generate_v4() primary key,
    project_id uuid references public.projects on delete cascade not null,
    category text not null,
    amount numeric(12, 2) not null,
    expense_date date not null,
    notes text,
    attachment_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Suppliers Table
create table if not exists public.suppliers (
    id uuid default uuid_generate_v4() primary key,
    company_id uuid references public.companies on delete cascade not null,
    name text not null,
    contact_person text,
    phone text,
    address text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add foreign key constraint to materials
alter table public.materials add constraint fk_supplier foreign key (supplier_id) references public.suppliers(id) on delete set null;

-- 7. Client Payments
create table if not exists public.client_payments (
    id uuid default uuid_generate_v4() primary key,
    project_id uuid references public.projects on delete cascade not null,
    client_name text not null,
    amount numeric(12, 2) not null,
    payment_date date not null,
    payment_method text,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Supplier Payments
create table if not exists public.supplier_payments (
    id uuid default uuid_generate_v4() primary key,
    supplier_id uuid references public.suppliers on delete cascade not null,
    project_id uuid references public.projects on delete cascade,
    amount numeric(12, 2) not null,
    payment_date date not null,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.project_assignments enable row level security;
alter table public.materials enable row level security;
alter table public.expenses enable row level security;
alter table public.suppliers enable row level security;
alter table public.client_payments enable row level security;
alter table public.supplier_payments enable row level security;

-- Basic RLS Policies Setup (To be expanded in application logic)
-- Users can read their own company data
create policy "Users can read own company" on public.companies
    for select using (id = (select company_id from public.users where id = auth.uid()));

-- Users can read projects belonging to their company
create policy "Users can view company projects" on public.projects
    for select using (company_id = (select company_id from public.users where id = auth.uid()));
