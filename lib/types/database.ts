// Database Enums
export type UserRole = 'employee' | 'approver' | 'admin'
export type EventStatus = 'pending' | 'approved' | 'rejected'
export type TransactionType = 'credit' | 'debit'
export type NotificationType =
    | 'event_approved'
    | 'event_rejected'
    | 'wallet_credit'
    | 'wallet_debit'
    | 'event_reminder'
    | 'feedback_response'
    | 'system'
export type FeedbackStatus = 'pending' | 'in_progress' | 'resolved' | 'closed'
export type FeedbackType = 'complaint' | 'suggestion'

// Database Tables
export interface User {
    id: string
    name: string
    email: string
    role: UserRole
    created_at: string
    updated_at: string
}

export interface Event {
    id: string
    title: string
    description: string | null
    start_time: string
    end_time: string
    budget: number | null
    status: EventStatus
    created_by: string
    approved_by: string | null
    approval_remarks: string | null
    created_at: string
    updated_at: string
}

export interface EventWithCreator extends Event {
    creator: Pick<User, 'id' | 'name' | 'email'>
    approver?: Pick<User, 'id' | 'name' | 'email'>
}

export interface Wallet {
    user_id: string
    balance: number
    created_at: string
    updated_at: string
}

export interface WalletTransaction {
    id: string
    user_id: string
    amount: number
    type: TransactionType
    description: string
    created_by: string
    created_at: string
}

export interface WalletTransactionWithUser extends WalletTransaction {
    user: Pick<User, 'id' | 'name' | 'email'>
    creator: Pick<User, 'id' | 'name' | 'email'>
}

// Form Types
export interface CreateEventInput {
    title: string
    description?: string
    start_time: Date
    end_time: Date
    budget?: number
}

export interface UpdateEventStatusInput {
    status: EventStatus
    approval_remarks?: string
}

export interface CreateTransactionInput {
    user_id: string
    amount: number
    type: TransactionType
    description: string
}

// Dashboard Stats
export interface DashboardStats {
    upcomingEventsCount: number
    pendingApprovalsCount: number  // For approvers
    walletBalance: number
    recentTransactionsCount: number
}

// Notifications
export interface Notification {
    id: string
    user_id: string
    type: NotificationType
    title: string
    message: string
    link: string | null
    is_read: boolean
    created_at: string
}

// Feedback/Complaints & Suggestions
export interface Feedback {
    id: string
    user_id: string
    type: FeedbackType
    subject: string
    description: string
    status: FeedbackStatus
    admin_response: string | null
    responded_by: string | null
    responded_at: string | null
    created_at: string
    updated_at: string
}

export interface FeedbackWithUser extends Feedback {
    user: Pick<User, 'id' | 'name' | 'email'>
    responder?: Pick<User, 'id' | 'name' | 'email'>
}

export interface CreateFeedbackInput {
    type: FeedbackType
    subject: string
    description: string
}

export interface UpdateFeedbackInput {
    status: FeedbackStatus
    admin_response?: string
}

