-- 1. Create Daily Reports Table (Missing in schema)
CREATE TABLE IF NOT EXISTS public.daily_reports (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    reporter_id uuid REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
    report_date date NOT NULL,
    work_completed text NOT NULL,
    issues text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS set_updated_at_daily_reports ON public.daily_reports;
CREATE TRIGGER set_updated_at_daily_reports
    BEFORE UPDATE ON public.daily_reports
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 2. Enable RLS and extend schema on operational tables
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget numeric(12, 2) DEFAULT 0.00;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- 3. Create Recursion-Free RLS Helper Functions (security definer to bypass policy checks)
CREATE OR REPLACE FUNCTION public.is_assigned_to_project(user_id uuid, proj_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_assignments
    WHERE user_id = $1 AND project_id = $2
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.project_belongs_to_company(proj_id uuid, comp_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = $1 AND company_id = $2
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. Clean up any existing policies to overwrite cleanly
DROP POLICY IF EXISTS "Users can view company projects" ON public.projects;
DROP POLICY IF EXISTS "Super Admin full control on projects" ON public.projects;
DROP POLICY IF EXISTS "Contractor Owners full control on projects" ON public.projects;
DROP POLICY IF EXISTS "Site Engineers read assigned projects" ON public.projects;

DROP POLICY IF EXISTS "Super Admin full control on assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "Contractor Owners full control on assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "Site Engineers read own assignments" ON public.project_assignments;

DROP POLICY IF EXISTS "Super Admin full control on materials" ON public.materials;
DROP POLICY IF EXISTS "Contractor Owners full control on company materials" ON public.materials;
DROP POLICY IF EXISTS "Site Engineers log materials on assigned projects" ON public.materials;

DROP POLICY IF EXISTS "Super Admin full control on expenses" ON public.expenses;
DROP POLICY IF EXISTS "Contractor Owners full control on company expenses" ON public.expenses;
DROP POLICY IF EXISTS "Site Engineers log expenses on assigned projects" ON public.expenses;

DROP POLICY IF EXISTS "Super Admin full control on suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Contractor Owners full control on company suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Site Engineers read company suppliers" ON public.suppliers;

DROP POLICY IF EXISTS "Super Admin full control on client payments" ON public.client_payments;
DROP POLICY IF EXISTS "Contractor Owners full control on company client payments" ON public.client_payments;

DROP POLICY IF EXISTS "Super Admin full control on supplier payments" ON public.supplier_payments;
DROP POLICY IF EXISTS "Contractor Owners full control on company supplier payments" ON public.supplier_payments;

DROP POLICY IF EXISTS "Super Admin full control on daily reports" ON public.daily_reports;
DROP POLICY IF EXISTS "Contractor Owners view company daily reports" ON public.daily_reports;
DROP POLICY IF EXISTS "Site Engineers manage daily reports on assigned projects" ON public.daily_reports;

-- ==========================================
-- PROJECTS POLICIES
-- ==========================================
CREATE POLICY "Super Admin full control on projects" ON public.projects 
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Contractor Owners full control on projects" ON public.projects 
  FOR ALL USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Site Engineers read assigned projects" ON public.projects 
  FOR SELECT USING (public.is_assigned_to_project(auth.uid(), id));

-- ==========================================
-- PROJECT ASSIGNMENTS POLICIES
-- ==========================================
CREATE POLICY "Super Admin full control on assignments" ON public.project_assignments 
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Contractor Owners full control on assignments" ON public.project_assignments 
  FOR ALL USING (public.project_belongs_to_company(project_id, public.get_user_company_id(auth.uid())))
  WITH CHECK (public.project_belongs_to_company(project_id, public.get_user_company_id(auth.uid())));

CREATE POLICY "Site Engineers read own assignments" ON public.project_assignments 
  FOR SELECT USING (user_id = auth.uid());

-- ==========================================
-- MATERIALS POLICIES
-- ==========================================
CREATE POLICY "Super Admin full control on materials" ON public.materials 
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Contractor Owners full control on company materials" ON public.materials 
  FOR ALL USING (public.project_belongs_to_company(project_id, public.get_user_company_id(auth.uid())))
  WITH CHECK (public.project_belongs_to_company(project_id, public.get_user_company_id(auth.uid())));

CREATE POLICY "Site Engineers log materials on assigned projects" ON public.materials 
  FOR ALL USING (public.is_assigned_to_project(auth.uid(), project_id))
  WITH CHECK (public.is_assigned_to_project(auth.uid(), project_id));

-- ==========================================
-- EXPENSES POLICIES
-- ==========================================
CREATE POLICY "Super Admin full control on expenses" ON public.expenses 
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Contractor Owners full control on company expenses" ON public.expenses 
  FOR ALL USING (public.project_belongs_to_company(project_id, public.get_user_company_id(auth.uid())))
  WITH CHECK (public.project_belongs_to_company(project_id, public.get_user_company_id(auth.uid())));

CREATE POLICY "Site Engineers log expenses on assigned projects" ON public.expenses 
  FOR ALL USING (public.is_assigned_to_project(auth.uid(), project_id))
  WITH CHECK (public.is_assigned_to_project(auth.uid(), project_id));

-- ==========================================
-- SUPPLIERS POLICIES
-- ==========================================
CREATE POLICY "Super Admin full control on suppliers" ON public.suppliers 
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Contractor Owners full control on company suppliers" ON public.suppliers 
  FOR ALL USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Site Engineers read company suppliers" ON public.suppliers 
  FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));

-- ==========================================
-- CLIENT PAYMENTS POLICIES
-- ==========================================
CREATE POLICY "Super Admin full control on client payments" ON public.client_payments 
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Contractor Owners full control on company client payments" ON public.client_payments 
  FOR ALL USING (public.project_belongs_to_company(project_id, public.get_user_company_id(auth.uid())))
  WITH CHECK (public.project_belongs_to_company(project_id, public.get_user_company_id(auth.uid())));

-- ==========================================
-- SUPPLIER PAYMENTS POLICIES
-- ==========================================
CREATE POLICY "Super Admin full control on supplier payments" ON public.supplier_payments 
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Contractor Owners full control on company supplier payments" ON public.supplier_payments 
  FOR ALL USING (public.project_belongs_to_company(project_id, public.get_user_company_id(auth.uid())))
  WITH CHECK (public.project_belongs_to_company(project_id, public.get_user_company_id(auth.uid())));

-- ==========================================
-- DAILY REPORTS POLICIES
-- ==========================================
CREATE POLICY "Super Admin full control on daily reports" ON public.daily_reports 
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Contractor Owners full control on company daily reports" ON public.daily_reports 
  FOR ALL USING (public.project_belongs_to_company(project_id, public.get_user_company_id(auth.uid())))
  WITH CHECK (public.project_belongs_to_company(project_id, public.get_user_company_id(auth.uid())));

CREATE POLICY "Site Engineers manage daily reports on assigned projects" ON public.daily_reports 
  FOR ALL USING (public.is_assigned_to_project(auth.uid(), project_id))
  WITH CHECK (public.is_assigned_to_project(auth.uid(), project_id));
