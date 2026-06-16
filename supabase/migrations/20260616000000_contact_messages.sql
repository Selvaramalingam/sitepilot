-- Create contact_messages table for landing page form submissions
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    message TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow public users (anonymous) to insert contact submissions
CREATE POLICY "Allow public inserts to contact_messages" 
ON public.contact_messages 
FOR INSERT 
WITH CHECK (true);

-- Allow Super Admins to read contact submissions
CREATE POLICY "Super Admins can read contact_messages" 
ON public.contact_messages 
FOR SELECT 
USING (public.is_super_admin(auth.uid()));
