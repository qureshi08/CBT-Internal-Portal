'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Calendar,
    Wallet,
    FileText,
    Plus,
    CheckCircle,
    Clock,
    XCircle,
    TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { Event, WalletTransaction, User } from '@/lib/types/database'
import { format } from 'date-fns'

interface DashboardData {
    user: User | null
    upcomingEvents: Event[]
    pendingEvents: Event[]
    walletBalance: number
    recentTransactions: WalletTransaction[]
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData>({
        user: null,
        upcomingEvents: [],
        pendingEvents: [],
        walletBalance: 0,
        recentTransactions: [],
    })
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const {
                    data: { user: authUser },
                } = await supabase.auth.getUser()

                if (!authUser) return

                // Fetch user data
                const { data: userData } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', authUser.id)
                    .single()

                // Fetch upcoming approved events
                const { data: upcomingEvents } = await supabase
                    .from('events')
                    .select('*')
                    .eq('status', 'approved')
                    .gte('start_time', new Date().toISOString())
                    .order('start_time', { ascending: true })
                    .limit(5)

                // Fetch pending events (for approvers/admins or user's own)
                let pendingEventsQuery = supabase
                    .from('events')
                    .select('*')
                    .eq('status', 'pending')

                if (userData?.role === 'employee') {
                    pendingEventsQuery = pendingEventsQuery.eq('created_by', authUser.id)
                }

                const { data: pendingEvents } = await pendingEventsQuery
                    .order('created_at', { ascending: false })
                    .limit(5)

                // Fetch wallet balance
                const { data: walletData } = await supabase
                    .from('wallets')
                    .select('balance')
                    .eq('user_id', authUser.id)
                    .single()

                // Fetch recent transactions
                const { data: transactions } = await supabase
                    .from('wallet_transactions')
                    .select('*')
                    .eq('user_id', authUser.id)
                    .order('created_at', { ascending: false })
                    .limit(5)

                setData({
                    user: userData,
                    upcomingEvents: upcomingEvents || [],
                    pendingEvents: pendingEvents || [],
                    walletBalance: walletData?.balance || 0,
                    recentTransactions: transactions || [],
                })
            } catch (error) {
                console.error('Error fetching dashboard data:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchDashboardData()
    }, [supabase])

    const getEventStatusIcon = (status: string) => {
        switch (status) {
            case 'approved':
                return <CheckCircle className="h-4 w-4 text-green-600" />
            case 'pending':
                return <Clock className="h-4 w-4 text-yellow-600" />
            case 'rejected':
                return <XCircle className="h-4 w-4 text-red-600" />
            default:
                return null
        }
    }

    if (isLoading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-muted rounded w-1/4"></div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-32 bg-muted rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Welcome back, {data.user?.name?.split(' ')[0]}! 👋
                </h1>
                <p className="text-muted-foreground mt-1">
                    Here's what's happening with your office today.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.upcomingEvents.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Next 30 days
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {data.user?.role === 'employee' ? 'My Requests' : 'Pending Approvals'}
                        </CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.pendingEvents.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Awaiting approval
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Rs. {data.walletBalance.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">
                            Honor Shop credit
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.recentTransactions.length}</div>
                        <p className="text-xs text-muted-foreground">
                            This month
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    <Link href="/events/new">
                        <Card className="hover:border-primary transition-colors cursor-pointer">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Plus className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Propose Event</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Submit a new event request
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/wallet">
                        <Card className="hover:border-primary transition-colors cursor-pointer">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Wallet className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Manage Wallet</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Add credits or make deductions
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </div>

            {/* Upcoming Events */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Upcoming Events</h2>
                    <Link href="/calendar">
                        <Button variant="ghost" size="sm">
                            View Calendar
                        </Button>
                    </Link>
                </div>
                {data.upcomingEvents.length > 0 ? (
                    <div className="space-y-3">
                        {data.upcomingEvents.map((event) => (
                            <Card key={event.id}>
                                <CardContent className="pt-6">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold">{event.title}</h3>
                                                <Badge variant="outline" className="text-green-600 border-green-600">
                                                    Approved
                                                </Badge>
                                            </div>
                                            {event.description && (
                                                <p className="text-sm text-muted-foreground">{event.description}</p>
                                            )}
                                            <p className="text-sm text-muted-foreground">
                                                📅 {format(new Date(event.start_time), 'PPP')} at{' '}
                                                {format(new Date(event.start_time), 'p')}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-center text-muted-foreground py-8">
                                No upcoming events scheduled
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Recent Transactions */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Recent Transactions</h2>
                    <Link href="/wallet">
                        <Button variant="ghost" size="sm">
                            View All
                        </Button>
                    </Link>
                </div>
                {data.recentTransactions.length > 0 ? (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                {data.recentTransactions.map((transaction) => (
                                    <div
                                        key={transaction.id}
                                        className="flex items-center justify-between pb-4 border-b last:border-0 last:pb-0"
                                    >
                                        <div className="space-y-1">
                                            <p className="font-medium">{transaction.description}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {format(new Date(transaction.created_at), 'PPP')}
                                            </p>
                                        </div>
                                        <div
                                            className={`font-semibold ${transaction.type === 'credit'
                                                    ? 'text-green-600'
                                                    : 'text-red-600'
                                                }`}
                                        >
                                            {transaction.type === 'credit' ? '+' : '-'}Rs.{' '}
                                            {transaction.amount.toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-center text-muted-foreground py-8">
                                No transactions yet
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
