-- Task Management Schema

-- 1. Create `tasks` table
CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    description text,
    assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
    priority text DEFAULT 'Medium', -- Low, Medium, High, Critical
    start_date date,
    due_date date,
    estimated_hours numeric(8, 2) DEFAULT 0.00,
    status text DEFAULT 'Draft', -- Draft, Pending, In Progress, On Hold, Review, Completed, Cancelled
    progress integer DEFAULT 0,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS set_updated_at_tasks ON public.tasks;
CREATE TRIGGER set_updated_at_tasks
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 2. Create `task_checklists` table
CREATE TABLE IF NOT EXISTS public.task_checklists (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    is_completed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS set_updated_at_task_checklists ON public.task_checklists;
CREATE TRIGGER set_updated_at_task_checklists
    BEFORE UPDATE ON public.task_checklists
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 3. Create `task_attachments` table
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    file_url text NOT NULL,
    file_name text NOT NULL,
    file_type text,
    file_size bigint,
    uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Create `task_comments` table
CREATE TABLE IF NOT EXISTS public.task_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 5. Create `task_history` table (audit log)
CREATE TABLE IF NOT EXISTS public.task_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    action text NOT NULL, -- e.g., 'STATUS_CHANGED', 'COMMENT_ADDED', 'CREATED'
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 6. Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies

-- TASKS
CREATE POLICY "Super Admin full control on tasks" ON public.tasks 
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Contractor Owners full control on company tasks" ON public.tasks 
  FOR ALL USING (public.project_belongs_to_company(project_id, public.get_user_company_id(auth.uid())))
  WITH CHECK (public.project_belongs_to_company(project_id, public.get_user_company_id(auth.uid())));

CREATE POLICY "Site Engineers manage assigned tasks" ON public.tasks 
  FOR ALL USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- TASK CHECKLISTS
CREATE POLICY "Super Admin full control on task checklists" ON public.task_checklists 
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Contractor Owners full control on company task checklists" ON public.task_checklists 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.project_belongs_to_company(t.project_id, public.get_user_company_id(auth.uid())))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.project_belongs_to_company(t.project_id, public.get_user_company_id(auth.uid())))
  );

CREATE POLICY "Site Engineers manage checklists on assigned tasks" ON public.task_checklists 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.assigned_to = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.assigned_to = auth.uid())
  );

-- TASK ATTACHMENTS
CREATE POLICY "Super Admin full control on task attachments" ON public.task_attachments 
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Contractor Owners full control on company task attachments" ON public.task_attachments 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.project_belongs_to_company(t.project_id, public.get_user_company_id(auth.uid())))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.project_belongs_to_company(t.project_id, public.get_user_company_id(auth.uid())))
  );

CREATE POLICY "Site Engineers manage attachments on assigned tasks" ON public.task_attachments 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.assigned_to = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.assigned_to = auth.uid())
  );

-- TASK COMMENTS
CREATE POLICY "Super Admin full control on task comments" ON public.task_comments 
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Contractor Owners full control on company task comments" ON public.task_comments 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.project_belongs_to_company(t.project_id, public.get_user_company_id(auth.uid())))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.project_belongs_to_company(t.project_id, public.get_user_company_id(auth.uid())))
  );

CREATE POLICY "Site Engineers manage comments on assigned tasks" ON public.task_comments 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.assigned_to = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.assigned_to = auth.uid())
  );

-- TASK HISTORY
CREATE POLICY "Super Admin full control on task history" ON public.task_history 
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Contractor Owners view company task history" ON public.task_history 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.project_belongs_to_company(t.project_id, public.get_user_company_id(auth.uid())))
  );
CREATE POLICY "Contractor Owners insert company task history" ON public.task_history 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.project_belongs_to_company(t.project_id, public.get_user_company_id(auth.uid())))
  );

CREATE POLICY "Site Engineers view history on assigned tasks" ON public.task_history 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.assigned_to = auth.uid())
  );
CREATE POLICY "Site Engineers insert history on assigned tasks" ON public.task_history 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.assigned_to = auth.uid())
  );

-- 8. Storage Bucket Setup (Storage tables are part of standard Supabase, creating bucket entry)
INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the bucket
-- Note: Requires storage schema extension which Supabase handles, but we write the policies directly.
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'task-attachments' );
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'task-attachments' AND auth.role() = 'authenticated' );
CREATE POLICY "Users can update own uploads" ON storage.objects FOR UPDATE USING ( bucket_id = 'task-attachments' AND owner = auth.uid() );
CREATE POLICY "Users can delete own uploads" ON storage.objects FOR DELETE USING ( bucket_id = 'task-attachments' AND owner = auth.uid() );
