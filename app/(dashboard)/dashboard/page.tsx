'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, Wallet, FileText, ChevronRight } from 'lucide-react'
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

                const { data: userData } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', authUser.id)
                    .single()

                const { data: upcomingEvents } = await supabase
                    .from('events')
                    .select('*')
                    .eq('status', 'approved')
                    .gte('start_time', new Date().toISOString())
                    .order('start_time', { ascending: true })
                    .limit(3)

                let pendingEventsQuery = supabase
                    .from('events')
                    .select('*')
                    .eq('status', 'pending')

                if (userData?.role === 'employee') {
                    pendingEventsQuery = pendingEventsQuery.eq('created_by', authUser.id)
                }

                const { data: pendingEvents } = await pendingEventsQuery
                    .order('created_at', { ascending: false })
                    .limit(3)

                const { data: walletData } = await supabase
                    .from('wallets')
                    .select('balance')
                    .eq('user_id', authUser.id)
                    .single()

                const { data: transactions } = await supabase
                    .from('wallet_transactions')
                    .select('*')
                    .eq('user_id', authUser.id)
                    .order('created_at', { ascending: false })
                    .limit(3)

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

    if (isLoading) {
        return (
            <div className="p-4 md:p-8 space-y-8 animate-pulse">
                <div className="h-8 bg-[#F2F2F2] w-48 rounded"></div>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-32 bg-[#F2F2F2] rounded border border-[#E0E0E0]"></div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 space-y-8 md:space-y-10 font-sans max-w-7xl mx-auto">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#333333]">
                    Welcome, {data.user?.name ? data.user.name.split(' ')[0] : 'User'}
                </h1>
                <p className="text-[#666666] text-xs md:text-sm">Overview of your activity and office events.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
                <Card className="rounded-[4px] border border-[#E0E0E0] shadow-sm overflow-hidden group hover:border-[#009245]/30 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-[#666666]">Wallet Balance</CardTitle>
                        <Wallet className="h-4 w-4 text-[#009245]" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl md:text-3xl font-bold text-[#009245]">Rs. {data.walletBalance.toFixed(2)}</div>
                        <p className="text-[10px] md:text-[11px] text-[#666666] mt-1">Available Honor Shop credits</p>
                    </CardContent>
                </Card>

                <Card className="rounded-[4px] border border-[#E0E0E0] shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-[#666666]">Approved Events</CardTitle>
                        <Calendar className="h-4 w-4 text-[#666666]" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl md:text-3xl font-bold text-[#333333]">{data.upcomingEvents.length} Upcoming</div>
                        <p className="text-[10px] md:text-[11px] text-[#009245] font-medium mt-1">Confirmed on calendar</p>
                    </CardContent>
                </Card>

                <Card className="rounded-[4px] border border-[#E0E0E0] shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-[#666666]">
                            {data.user?.role === 'employee' ? 'My Requests' : 'Pending Requests'}
                        </CardTitle>
                        <FileText className="h-4 w-4 text-[#666666]" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl md:text-3xl font-bold text-[#333333]">{data.pendingEvents.length} Awaiting</div>
                        <p className="text-[10px] md:text-[11px] text-[#666666] mt-1">Current processing status</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
                {/* Left Column: Events */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E0E0E0] pb-2">
                        <h2 className="text-base md:text-lg font-bold text-[#333333]">Upcoming Events</h2>
                        <Link href="/calendar" className="text-[10px] md:text-xs font-semibold text-[#009245] hover:underline flex items-center">
                            View All <ChevronRight className="h-3 w-3 ml-0.5" />
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {data.upcomingEvents.length > 0 ? (
                            data.upcomingEvents.map((event) => (
                                <div key={event.id} className="p-4 rounded-[4px] border border-[#E0E0E0] bg-white group hover:border-[#009245] transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-[#009245] text-[10px] font-bold uppercase tracking-tight">
                                                {format(new Date(event.start_time), 'EEE, MMM d')}
                                            </p>
                                            <h3 className="text-sm font-bold text-[#333333] mt-0.5">{event.title}</h3>
                                            <p className="text-[11px] text-[#666666] mt-1">{format(new Date(event.start_time), 'p')}</p>
                                        </div>
                                        <div className="px-2 py-0.5 rounded-[2px] bg-[#E6F4EA] text-[#009245] text-[9px] font-bold uppercase">
                                            Approved
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 border border-dashed border-[#E0E0E0] rounded-[4px] text-center">
                                <p className="text-[11px] text-[#666666]">No upcoming confirmed events</p>
                            </div>
                        )}

                        <Link href="/events" className="block mt-4">
                            <Button className="w-full rounded-[4px] bg-white text-[#009245] border border-[#009245] hover:bg-[#F2F2F2] font-semibold text-xs h-10 shadow-none transition-colors">
                                <Plus className="h-4 w-4 mr-1.5" /> Submit New Proposal
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Right Column: Wallet */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E0E0E0] pb-2">
                        <h2 className="text-base md:text-lg font-bold text-[#333333]">Recent Transactions</h2>
                        <Link href="/wallet" className="text-[10px] md:text-xs font-semibold text-[#009245] hover:underline flex items-center">
                            Go to Wallet <ChevronRight className="h-3 w-3 ml-0.5" />
                        </Link>
                    </div>

                    <div className="rounded-[4px] border border-[#E0E0E0] overflow-hidden divide-y divide-[#E0E0E0]">
                        {data.recentTransactions.length > 0 ? (
                            data.recentTransactions.map((transaction) => (
                                <div key={transaction.id} className="p-4 flex items-center justify-between bg-white hover:bg-[#F2F2F2] transition-colors">
                                    <div className="truncate pr-4">
                                        <h4 className="text-sm font-semibold text-[#333333] leading-none truncate">{transaction.description}</h4>
                                        <p className="text-[10px] md:text-[11px] text-[#666666] mt-1">
                                            {format(new Date(transaction.created_at), 'MMM d, p')}
                                        </p>
                                    </div>
                                    <div className={`text-sm font-bold shrink-0 ${transaction.type === 'credit' ? 'text-[#009245]' : 'text-[#333333]'}`}>
                                        {transaction.type === 'credit' ? '+' : '-'} Rs. {transaction.amount.toFixed(2)}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-white bg-white">
                                <p className="text-[11px] text-[#666666]">No transaction history available</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-[#E6F4EA] rounded-[4px] border border-[#009245]/10">
                        <p className="text-[10px] md:text-[11px] font-medium text-[#009245] leading-relaxed">
                            Honor Shop is based on trust. Always record your item pickups and top-ups accurately.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
