-- 1. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read same company profiles" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read own company" ON public.companies;
DROP POLICY IF EXISTS "Contractor Owners can update own company" ON public.companies;
DROP POLICY IF EXISTS "Users can view company projects" ON public.projects;

-- 2. Create helper function to get user's company_id (security definer to bypass RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_company_id(user_id uuid)
RETURNS uuid AS $$
  SELECT company_id FROM public.users WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Create helper function to get user's role (security definer to bypass RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS public.user_role AS $$
  SELECT role FROM public.users WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. Re-create non-recursive SELECT policies on public.users
CREATE POLICY "Users can read own profile" ON public.users 
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can read same company profiles" ON public.users 
  FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));

-- 5. Re-create non-recursive SELECT/UPDATE policies on public.companies
CREATE POLICY "Users can read own company" ON public.companies 
  FOR SELECT USING (id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Contractor Owners can update own company" ON public.companies 
  FOR UPDATE USING (
    id = public.get_user_company_id(auth.uid())
    AND public.get_user_role(auth.uid()) = 'CONTRACTOR_OWNER'
  );

-- 6. Re-create non-recursive SELECT policy on public.projects
CREATE POLICY "Users can view company projects" ON public.projects
  FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));
