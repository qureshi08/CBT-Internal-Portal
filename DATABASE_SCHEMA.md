# Database Schema & Setup Guide

## Overview
This document contains the complete database schema for the CBT Internal Portal.
Execute these SQL commands in your Supabase SQL Editor.

---

## 1. Enable Required Extensions

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

## 2. Create Enums

```sql
-- User roles
CREATE TYPE user_role AS ENUM ('employee', 'approver', 'admin');

-- Event status
CREATE TYPE event_status AS ENUM ('pending', 'approved', 'rejected');

-- Transaction type
CREATE TYPE transaction_type AS ENUM ('credit', 'debit');
```

---

## 3. Create Tables

### 3.1 Users (extends auth.users)

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role DEFAULT 'employee',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
```

### 3.2 Events

```sql
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Indexes
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_created_by ON public.events(created_by);
CREATE INDEX idx_events_dates ON public.events(start_time, end_time);

-- Function to prevent overlapping approved events
CREATE OR REPLACE FUNCTION check_event_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    IF EXISTS (
      SELECT 1 FROM public.events
      WHERE status = 'approved'
        AND id != COALESCE(NEW.id, uuid_generate_v4())
        AND (
          (NEW.start_time, NEW.end_time) OVERLAPS (start_time, end_time)
        )
    ) THEN
      RAISE EXCEPTION 'Event conflicts with an existing approved event';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check overlaps
CREATE TRIGGER prevent_event_overlap
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION check_event_overlap();
```

### 3.3 Wallets

```sql
CREATE TABLE public.wallets (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  balance DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT non_negative_balance CHECK (balance >= 0)
);

-- Automatically create wallet for new users
CREATE OR REPLACE FUNCTION create_wallet_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0.00);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_wallet
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_for_user();
```

### 3.4 Wallet Transactions

```sql
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  type transaction_type NOT NULL,
  description TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Indexes
CREATE INDEX idx_wallet_transactions_user ON public.wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_created_at ON public.wallet_transactions(created_at DESC);

-- Function to update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'credit' THEN
    UPDATE public.wallets
    SET balance = balance + NEW.amount,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  ELSIF NEW.type = 'debit' THEN
    UPDATE public.wallets
    SET balance = balance - NEW.amount,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    -- Check if balance went negative
    IF (SELECT balance FROM public.wallets WHERE user_id = NEW.user_id) < 0 THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update wallet on transaction
CREATE TRIGGER auto_update_wallet_balance
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_balance();
```

---

## 4. Row Level Security (RLS)

### 4.1 Enable RLS

```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
```

### 4.2 Users Policies

```sql
-- Users can view all users
CREATE POLICY "Users can view all users"
  ON public.users FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Only admins can insert/delete users
CREATE POLICY "Admins can insert users"
  ON public.users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete users"
  ON public.users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### 4.3 Events Policies

```sql
-- All authenticated users can view events
CREATE POLICY "Users can view all events"
  ON public.events FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- All authenticated users can create events
CREATE POLICY "Users can create events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Users can update their own pending events
CREATE POLICY "Users can update own pending events"
  ON public.events FOR UPDATE
  USING (auth.uid() = created_by AND status = 'pending');

-- Approvers can update any event
CREATE POLICY "Approvers can update events"
  ON public.events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('approver', 'admin')
    )
  );

-- Users can delete their own pending events
CREATE POLICY "Users can delete own pending events"
  ON public.events FOR DELETE
  USING (auth.uid() = created_by AND status = 'pending');
```

### 4.4 Wallets Policies

```sql
-- Users can view all wallets
CREATE POLICY "Users can view wallets"
  ON public.wallets FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- System-managed (no direct updates allowed by users)
-- Updates only happen through triggers
```

### 4.5 Wallet Transactions Policies

```sql
-- Users can view all transactions
CREATE POLICY "Users can view transactions"
  ON public.wallet_transactions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can create transactions for themselves
CREATE POLICY "Users can create own transactions"
  ON public.wallet_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() = created_by);

-- Admins can create transactions for anyone
CREATE POLICY "Admins can create any transaction"
  ON public.wallet_transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'approver')
    )
  );
```

---

## 5. Helper Functions

### 5.1 Get User Role

```sql
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;
```

### 5.2 Get Upcoming Events

```sql
CREATE OR REPLACE FUNCTION get_upcoming_events(limit_count INT DEFAULT 5)
RETURNS TABLE (
  id UUID,
  title TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status event_status
) AS $$
  SELECT id, title, start_time, end_time, status
  FROM public.events
  WHERE status = 'approved'
    AND start_time >= NOW()
  ORDER BY start_time ASC
  LIMIT limit_count;
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## 6. Initial Data Setup

### 6.1 Create Initial Admin User (After First Sign Up)

After your first user signs up through the application, run this to make them an admin:

```sql
-- Replace 'admin@cbt.com' with your actual admin email
UPDATE public.users
SET role = 'admin'
WHERE email = 'admin@cbt.com';
```

### 6.2 Create Sample Approvers

```sql
-- After users sign up, promote them to approvers
UPDATE public.users
SET role = 'approver'
WHERE email IN ('farooq@cbt.com', 'salman@cbt.com');
```

---

## 7. Realtime Subscriptions (Optional)

Enable realtime for tables that need live updates:

```sql
-- Enable realtime for events table
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
```

---

## 8. Database Maintenance

### 8.1 Update Timestamps Function

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Setup Instructions

1. **Create a Supabase Project**
   - Go to https://supabase.com
   - Create a new project
   - Note your project URL and anon key

2. **Run SQL Commands**
   - Open the SQL Editor in Supabase Dashboard
   - Copy and paste each section above in order
   - Execute them one by one

3. **Configure Authentication**
   - Go to Authentication → Settings
   - Set Site URL to your app URL
   - Configure email templates if needed

4. **Update Environment Variables**
   - Copy `.env.local.example` to `.env.local`
   - Add your Supabase URL and anon key

5. **Test the Setup**
   - Sign up your first user
   - Promote them to admin using the SQL command above
   - Start using the application!

---

## Troubleshooting

### If you get "permission denied" errors:
- Make sure RLS policies are set up correctly
- Check that the user is authenticated
- Verify the user's role is correct

### If wallet balance is incorrect:
- Check the wallet_transactions table
- Manually recalculate: `UPDATE public.wallets SET balance = (SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0) FROM public.wallet_transactions WHERE user_id = wallets.user_id)`

### If events overlap despite the check:
- Make sure the trigger is created
- Check that both events have status = 'approved'
