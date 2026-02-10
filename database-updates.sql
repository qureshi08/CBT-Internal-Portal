-- ==========================================
-- NOTIFICATIONS & FEEDBACK SYSTEM
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. Create notification_type enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM (
            'event_approved', 
            'event_rejected', 
            'wallet_credit', 
            'wallet_debit',
            'event_reminder',
            'feedback_response',
            'system'
        );
    END IF;
END $$;

-- 2. Create feedback_status enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feedback_status') THEN
        CREATE TYPE feedback_status AS ENUM ('pending', 'in_progress', 'resolved', 'closed');
    END IF;
END $$;

-- 3. Create feedback_type enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feedback_type') THEN
        CREATE TYPE feedback_type AS ENUM ('complaint', 'suggestion');
    END IF;
END $$;

-- 4. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- 5. Feedback Table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type feedback_type NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status feedback_status DEFAULT 'pending',
    admin_response TEXT,
    responded_by UUID REFERENCES public.users(id),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(type);

-- 6. Function to create notification on event status change
CREATE OR REPLACE FUNCTION public.notify_event_status_change()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    -- Only create notification if status changed
    IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status != 'pending') THEN
        INSERT INTO public.notifications (user_id, type, title, message, link)
        VALUES (
            NEW.created_by,
            CASE 
                WHEN NEW.status = 'approved' THEN 'event_approved'::notification_type
                WHEN NEW.status = 'rejected' THEN 'event_rejected'::notification_type
            END,
            CASE 
                WHEN NEW.status = 'approved' THEN 'Event Approved ✅'
                WHEN NEW.status = 'rejected' THEN 'Event Rejected ❌'
            END,
            CASE 
                WHEN NEW.status = 'approved' THEN 'Your event "' || NEW.title || '" has been approved!'
                WHEN NEW.status = 'rejected' THEN 'Your event "' || NEW.title || '" has been rejected. ' || COALESCE('Reason: ' || NEW.approval_remarks, '')
            END,
            '/events'
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger for event status changes
DROP TRIGGER IF EXISTS event_status_notification ON public.events;
CREATE TRIGGER event_status_notification
    AFTER UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.notify_event_status_change();

-- 7. Function to create notification on wallet transaction
CREATE OR REPLACE FUNCTION public.notify_wallet_transaction()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
        NEW.user_id,
        CASE 
            WHEN NEW.type = 'credit' THEN 'wallet_credit'::notification_type
            WHEN NEW.type = 'debit' THEN 'wallet_debit'::notification_type
        END,
        CASE 
            WHEN NEW.type = 'credit' THEN 'Honor Points Added 💰'
            WHEN NEW.type = 'debit' THEN 'Honor Points Deducted 📉'
        END,
        CASE 
            WHEN NEW.type = 'credit' THEN 'You received ' || NEW.amount || ' honor points. ' || NEW.description
            WHEN NEW.type = 'debit' THEN 'You spent ' || NEW.amount || ' honor points. ' || NEW.description
        END,
        '/wallet'
    );
    RETURN NEW;
END;
$$;

-- Trigger for wallet transactions
DROP TRIGGER IF EXISTS wallet_transaction_notification ON public.wallet_transactions;
CREATE TRIGGER wallet_transaction_notification
    AFTER INSERT ON public.wallet_transactions
    FOR EACH ROW EXECUTE FUNCTION public.notify_wallet_transaction();

-- 8. Function to notify user when admin responds to feedback
CREATE OR REPLACE FUNCTION public.notify_feedback_response()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    -- Only create notification if admin_response was added or status changed
    IF (TG_OP = 'UPDATE' AND (OLD.admin_response IS NULL AND NEW.admin_response IS NOT NULL)) THEN
        INSERT INTO public.notifications (user_id, type, title, message, link)
        VALUES (
            NEW.user_id,
            'feedback_response'::notification_type,
            'Response to Your ' || CASE WHEN NEW.type = 'complaint' THEN 'Complaint' ELSE 'Suggestion' END,
            'An admin has responded to your feedback: "' || NEW.subject || '"',
            '/feedback'
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger for feedback responses
DROP TRIGGER IF EXISTS feedback_response_notification ON public.feedback;
CREATE TRIGGER feedback_response_notification
    AFTER UPDATE ON public.feedback
    FOR EACH ROW EXECUTE FUNCTION public.notify_feedback_response();

-- Grant permissions (adjust as needed based on your RLS policies)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for feedback
CREATE POLICY "Users can view their own feedback"
    ON public.feedback FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback"
    ON public.feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
    ON public.feedback FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all feedback"
    ON public.feedback FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
