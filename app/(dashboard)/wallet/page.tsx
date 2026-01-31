'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Wallet, Plus, Minus, Loader2, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { WalletTransaction, User } from '@/lib/types/database'

export default function WalletPage() {
    const [user, setUser] = useState<User | null>(null)
    const [balance, setBalance] = useState<number>(0)
    const [transactions, setTransactions] = useState<WalletTransaction[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form states
    const [amount, setAmount] = useState('')
    const [description, setDescription] = useState('')
    const [transactionType, setTransactionType] = useState<'credit' | 'debit'>('credit')
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const supabase = createClient()

    const fetchData = async () => {
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) return

            const [userRes, balanceRes, transRes] = await Promise.all([
                supabase.from('users').select('*').eq('id', authUser.id).single(),
                supabase.from('wallets').select('balance').eq('user_id', authUser.id).single(),
                supabase.from('wallet_transactions')
                    .select('*')
                    .eq('user_id', authUser.id)
                    .order('created_at', { ascending: false })
            ])

            if (userRes.data) setUser(userRes.data)
            if (balanceRes.data) setBalance(balanceRes.data.balance)
            if (transRes.data) setTransactions(transRes.data)
        } catch (error) {
            console.error('Error fetching wallet data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleTransaction = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !amount || parseFloat(amount) <= 0 || !description) return

        setIsSubmitting(true)
        try {
            const { error } = await supabase.from('wallet_transactions').insert({
                user_id: user.id,
                amount: parseFloat(amount),
                type: transactionType,
                description: description,
                created_by: user.id
            })

            if (error) throw error

            setAmount('')
            setDescription('')
            setIsDialogOpen(false)
            await fetchData()
        } catch (error: any) {
            alert(error.message || 'Transaction failed')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center p-8 bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-[#009245]" />
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-10 font-sans max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#E0E0E0] pb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#333333]">Honor Shop Wallet</h1>
                    <p className="text-[#666666] text-xs md:text-sm mt-1">Trust-based pocket for office items and snacks.</p>
                </div>

                <div className="flex gap-2 sm:gap-3">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                onClick={() => setTransactionType('credit')}
                                className="flex-1 sm:flex-none rounded-[4px] bg-[#009245] hover:bg-[#007A33] text-white font-semibold text-xs md:text-sm h-10 px-4 md:px-5 shadow-sm"
                            >
                                <Plus className="h-4 w-4 mr-1 sm:mr-1.5" /> Top Up
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-[4px] border border-[#E0E0E0] p-0 overflow-hidden shadow-lg max-w-[90vw] sm:max-w-sm bg-white">
                            <form onSubmit={handleTransaction}>
                                <div className="bg-[#009245] text-white p-5 md:p-6">
                                    <DialogTitle className="text-lg md:text-xl font-bold tracking-tight">
                                        {transactionType === 'credit' ? 'Add Credits' : 'Deduct Amount'}
                                    </DialogTitle>
                                    <DialogDescription className="text-white/80 text-[10px] md:text-xs mt-1">
                                        {transactionType === 'credit'
                                            ? 'Record a manual top-up based on trust.'
                                            : 'Record an item pickup from the shop.'}
                                    </DialogDescription>
                                </div>
                                <div className="p-5 md:p-6 space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="amount" className="text-[10px] sm:text-xs font-semibold text-[#333333] uppercase">Amount (Rs.)</Label>
                                        <Input
                                            id="amount"
                                            type="number"
                                            placeholder="0.00"
                                            className="rounded-[4px] border-[#E0E0E0] h-10 font-bold focus-visible:ring-1 focus-visible:ring-[#009245]"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            required
                                            min="1"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="description" className="text-[10px] sm:text-xs font-semibold text-[#333333] uppercase">Description / Item</Label>
                                        <Input
                                            id="description"
                                            placeholder={transactionType === 'credit' ? 'Funds added' : 'e.g. Lays'}
                                            className="rounded-[4px] border-[#E0E0E0] h-10 focus-visible:ring-1 focus-visible:ring-[#009245] placeholder:text-[#999999]"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="p-5 md:p-6 pt-0 flex gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1 rounded-[4px] border-[#E0E0E0] font-semibold text-[10px] sm:text-xs h-10"
                                        onClick={() => setIsDialogOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1 rounded-[4px] bg-[#009245] text-white font-bold text-[10px] sm:text-xs h-10"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? '...' : 'Confirm'}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <Button
                        variant="outline"
                        onClick={() => { setTransactionType('debit'); setIsDialogOpen(true); }}
                        className="flex-1 sm:flex-none rounded-[4px] border-[#009245] bg-white text-[#009245] hover:bg-[#F2F2F2] font-semibold text-xs md:text-sm h-10 px-4 md:px-5"
                    >
                        <Minus className="h-4 w-4 mr-1 sm:mr-1.5" /> Use Credits
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:gap-10 grid-cols-1 md:grid-cols-3 items-start">
                <Card className="md:col-span-1 rounded-[4px] border border-[#E0E0E0] shadow-sm bg-white p-6 md:p-8">
                    <CardHeader className="p-0 pb-2">
                        <CardTitle className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-[#666666]">Current Balance</CardTitle>
                    </CardHeader>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl md:text-5xl font-bold tracking-tight text-[#009245]">Rs. {balance.toFixed(2)}</span>
                    </div>
                    <div className="h-px w-full bg-[#E0E0E0] mt-4 md:mt-6"></div>
                    <div className="flex items-center gap-2 mt-4 text-[#666666]">
                        <Wallet className="h-3 w-3" />
                        <p className="text-[10px] md:text-[11px] font-medium uppercase tracking-wide">Available Credits</p>
                    </div>
                </Card>

                <div className="md:col-span-2 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E0E0E0] pb-2">
                        <h2 className="text-base md:text-lg font-bold text-[#333333]">Transaction History</h2>
                    </div>

                    <div className="rounded-[4px] border border-[#E0E0E0] bg-white overflow-hidden shadow-sm overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-[#F2F2F2]">
                                <TableRow className="border-b border-[#E0E0E0] hover:bg-transparent">
                                    <TableHead className="text-[#333333] font-bold text-[10px] sm:text-xs h-10 px-4 md:px-6">Date</TableHead>
                                    <TableHead className="text-[#333333] font-bold text-[10px] sm:text-xs h-10 px-4 md:px-6">Description</TableHead>
                                    <TableHead className="text-right text-[#333333] font-bold text-[10px] sm:text-xs h-10 px-4 md:px-6">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-16 md:py-20 text-[10px] sm:text-xs text-[#666666] italic">
                                            No transactions found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    transactions.map((t) => (
                                        <TableRow key={t.id} className="border-b border-[#E0E0E0] last:border-0 hover:bg-[#F2F2F2]/50 transition-colors">
                                            <TableCell className="text-[10px] md:text-xs text-[#666666] px-4 md:px-6 py-3 md:py-4">
                                                {format(new Date(t.created_at), 'MMM d, h:mm a')}
                                            </TableCell>
                                            <TableCell className="text-[11px] md:text-sm font-semibold text-[#333333] px-4 md:px-6 py-3 md:py-4 truncate max-w-[120px] md:max-w-none">{t.description}</TableCell>
                                            <TableCell className="text-right px-4 md:px-6 py-3 md:py-4">
                                                <span className={`text-[11px] md:text-sm font-bold ${t.type === 'credit' ? 'text-[#009245]' : 'text-[#333333]'}`}>
                                                    {t.type === 'credit' ? '+' : '-'} Rs. {t.amount}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="p-3 md:p-4 bg-[#F2F2F2] rounded-[4px] text-[10px] md:text-[11px] text-[#666666] leading-relaxed">
                        Notice: All transactions are immutable and logged. Honor Shop is based on trust.
                    </div>
                </div>
            </div>
        </div>
    )
}
