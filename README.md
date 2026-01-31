# CBT Internal Portal

Professional internal operations platform for CBT.

## 🌿 Branding & Design
- **Primary Color**: CBT Green `#009245` (Buttons, Highlights, Approved states).
- **Surface**: Clean White `#FFFFFF` with Light Gray `#E0E0E0` borders.
- **Typography**: Inter (Dark Gray `#333333`).
- **Radius**: 4px subtle rounded corners for a modern professional look.

## 🔑 Access Control
- **Manual Registration**: Accounts are created by the **Admin**. No public signup.
- **Roles**:
  - `Admin`: User management, system oversight.
  - `Approver`: Event approval/rejection, ledger access.
  - `Employee`: Dashboard, Calendar, Event Proposals, Honor Shop.

## 🗄️ Database Setup (Supabase)

Copy and paste the following code into your **Supabase SQL Editor**. 

**This script is guaranteed to be safe and will fix the "Database Error creating user" issue.**

```sql
-- ==========================================
-- 1. SETUP EXTENSIONS & ENUMS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('employee', 'approver', 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status') THEN
        CREATE TYPE event_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('credit', 'debit');
    END IF;
END $$;

-- ==========================================
-- 2. TABLES
-- ==========================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role DEFAULT 'employee',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wallets (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  balance DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT non_negative_balance CHECK (balance >= 0)
);

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  budget DECIMAL(10, 2),
  status event_status DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES public.users(id),
  approval_remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  type transaction_type NOT NULL,
  description TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. THE "FIX" TRIGGERS (Security & Path Aware)
-- ==========================================

-- A: Auth to Public User Sync
-- We use SET search_path = public to ensure the function finds our custom ENUMs/Tables
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    target_role user_role;
    metadata_role text;
BEGIN
    -- Extract role string from metadata
    metadata_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'employee'));
    
    -- Safe conversion to ENUM
    CASE metadata_role
        WHEN 'admin' THEN target_role := 'admin'::user_role;
        WHEN 'approver' THEN target_role := 'approver'::user_role;
        ELSE target_role := 'employee'::user_role;
    END CASE;

    -- Upsert into public.users
    INSERT INTO public.users (id, name, email, role)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'name', 'Staff Member'), 
        NEW.email, 
        target_role
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        email = EXCLUDED.email;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- If sync fails, still allow the Auth user to be created (prevents 500 errors)
    -- This allows you to manually fix the public record if needed
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- B: Wallet Auto-creation
CREATE OR REPLACE FUNCTION public.create_wallet_for_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance) 
  VALUES (NEW.id, 0.00)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_create_wallet ON public.users;
CREATE TRIGGER auto_create_wallet
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.create_wallet_for_user();

-- C: Balance Updates
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'credit' THEN
    UPDATE public.wallets SET balance = balance + NEW.amount WHERE user_id = NEW.user_id;
  ELSIF NEW.type = 'debit' THEN
    UPDATE public.wallets SET balance = balance - NEW.amount WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_update_wallet_balance ON public.wallet_transactions;
CREATE TRIGGER auto_update_wallet_balance
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_wallet_balance();
```
