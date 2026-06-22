-- Personal Finance & Accounting Module Schema

-- 1. Create `finance_accounts` table
CREATE TABLE IF NOT EXISTS public.finance_accounts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    type text NOT NULL, -- Cash, Bank, UPI, Credit Card, Digital Wallet
    currency text DEFAULT 'USD',
    balance numeric(12, 2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS set_updated_at_finance_accounts ON public.finance_accounts;
CREATE TRIGGER set_updated_at_finance_accounts
    BEFORE UPDATE ON public.finance_accounts
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 2. Create `finance_categories` table
CREATE TABLE IF NOT EXISTS public.finance_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    type text NOT NULL, -- INCOME, EXPENSE
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Create `finance_vendors` table
CREATE TABLE IF NOT EXISTS public.finance_vendors (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    contact_person text,
    phone text,
    email text,
    address text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS set_updated_at_finance_vendors ON public.finance_vendors;
CREATE TRIGGER set_updated_at_finance_vendors
    BEFORE UPDATE ON public.finance_vendors
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 4. Create `finance_transactions` table
CREATE TABLE IF NOT EXISTS public.finance_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    type text NOT NULL, -- INCOME, EXPENSE, TRANSFER
    amount numeric(12, 2) NOT NULL,
    date date NOT NULL,
    account_id uuid REFERENCES public.finance_accounts(id) ON DELETE RESTRICT,
    to_account_id uuid REFERENCES public.finance_accounts(id) ON DELETE RESTRICT, -- Used only for transfers
    category_id uuid REFERENCES public.finance_categories(id) ON DELETE SET NULL,
    vendor_id uuid REFERENCES public.finance_vendors(id) ON DELETE SET NULL,
    payment_method text,
    reference_number text,
    notes text,
    receipt_url text,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS set_updated_at_finance_transactions ON public.finance_transactions;
CREATE TRIGGER set_updated_at_finance_transactions
    BEFORE UPDATE ON public.finance_transactions
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Trigger function to update account balances
CREATE OR REPLACE FUNCTION public.update_finance_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.type = 'INCOME' THEN
            UPDATE public.finance_accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
        ELSIF NEW.type = 'EXPENSE' THEN
            UPDATE public.finance_accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
        ELSIF NEW.type = 'TRANSFER' THEN
            UPDATE public.finance_accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
            UPDATE public.finance_accounts SET balance = balance + NEW.amount WHERE id = NEW.to_account_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.type = 'INCOME' THEN
            UPDATE public.finance_accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
        ELSIF OLD.type = 'EXPENSE' THEN
            UPDATE public.finance_accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
        ELSIF OLD.type = 'TRANSFER' THEN
            UPDATE public.finance_accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
            UPDATE public.finance_accounts SET balance = balance - OLD.amount WHERE id = OLD.to_account_id;
        END IF;
    END IF;
    RETURN NULL; -- For AFTER triggers, return value is ignored
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS finance_transaction_balance_trigger ON public.finance_transactions;
CREATE TRIGGER finance_transaction_balance_trigger
    AFTER INSERT OR DELETE ON public.finance_transactions
    FOR EACH ROW EXECUTE PROCEDURE public.update_finance_account_balance();

-- 5. Create `finance_recurring_bills` table
CREATE TABLE IF NOT EXISTS public.finance_recurring_bills (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    amount numeric(12, 2) NOT NULL,
    category_id uuid REFERENCES public.finance_categories(id) ON DELETE SET NULL,
    vendor_id uuid REFERENCES public.finance_vendors(id) ON DELETE SET NULL,
    account_id uuid REFERENCES public.finance_accounts(id) ON DELETE SET NULL,
    frequency text NOT NULL, -- Daily, Weekly, Monthly, Quarterly, Yearly
    next_due_date date NOT NULL,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS set_updated_at_finance_recurring_bills ON public.finance_recurring_bills;
CREATE TRIGGER set_updated_at_finance_recurring_bills
    BEFORE UPDATE ON public.finance_recurring_bills
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


-- Row Level Security (RLS) Configuration

-- Enable RLS
ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_recurring_bills ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user belongs to the company
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(c_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND company_id = c_id
        AND role = 'CONTRACTOR_OWNER'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for finance_accounts
CREATE POLICY "Admin can view their company accounts"
    ON public.finance_accounts FOR SELECT
    USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Admin can insert company accounts"
    ON public.finance_accounts FOR INSERT
    WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Admin can update company accounts"
    ON public.finance_accounts FOR UPDATE
    USING (public.user_belongs_to_company(company_id))
    WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Admin can delete company accounts"
    ON public.finance_accounts FOR DELETE
    USING (public.user_belongs_to_company(company_id));

-- Policies for finance_categories
CREATE POLICY "Admin can view their company categories"
    ON public.finance_categories FOR SELECT
    USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Admin can insert company categories"
    ON public.finance_categories FOR INSERT
    WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Admin can update company categories"
    ON public.finance_categories FOR UPDATE
    USING (public.user_belongs_to_company(company_id))
    WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Admin can delete company categories"
    ON public.finance_categories FOR DELETE
    USING (public.user_belongs_to_company(company_id));

-- Policies for finance_vendors
CREATE POLICY "Admin can view their company vendors"
    ON public.finance_vendors FOR SELECT
    USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Admin can insert company vendors"
    ON public.finance_vendors FOR INSERT
    WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Admin can update company vendors"
    ON public.finance_vendors FOR UPDATE
    USING (public.user_belongs_to_company(company_id))
    WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Admin can delete company vendors"
    ON public.finance_vendors FOR DELETE
    USING (public.user_belongs_to_company(company_id));

-- Policies for finance_transactions
CREATE POLICY "Admin can view their company transactions"
    ON public.finance_transactions FOR SELECT
    USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Admin can insert company transactions"
    ON public.finance_transactions FOR INSERT
    WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Admin can update company transactions"
    ON public.finance_transactions FOR UPDATE
    USING (public.user_belongs_to_company(company_id))
    WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Admin can delete company transactions"
    ON public.finance_transactions FOR DELETE
    USING (public.user_belongs_to_company(company_id));

-- Policies for finance_recurring_bills
CREATE POLICY "Admin can view their company recurring bills"
    ON public.finance_recurring_bills FOR SELECT
    USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Admin can insert company recurring bills"
    ON public.finance_recurring_bills FOR INSERT
    WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Admin can update company recurring bills"
    ON public.finance_recurring_bills FOR UPDATE
    USING (public.user_belongs_to_company(company_id))
    WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Admin can delete company recurring bills"
    ON public.finance_recurring_bills FOR DELETE
    USING (public.user_belongs_to_company(company_id));


-- Storage bucket for finance receipts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('finance-receipts', 'finance-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Give public access to finance-receipts" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'finance-receipts');

CREATE POLICY "Allow authenticated uploads to finance-receipts" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'finance-receipts' AND auth.role() = 'authenticated');
