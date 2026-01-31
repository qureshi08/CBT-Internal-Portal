'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { User as UserType } from '@/lib/types/database'
import {
    Calendar,
    LayoutDashboard,
    Wallet,
    FileText,
    LogOut,
    Menu,
    X,
    Users,
    Lock,
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changeOwnPassword } from './admin/users/actions'

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Event Requests', href: '/events', icon: FileText },
    { name: 'Honor Shop', href: '/wallet', icon: Wallet },
    { name: 'User Management', href: '/admin/users', icon: Users, adminOnly: true },
]

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [user, setUser] = useState<UserType | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
    const [newPassword, setNewPassword] = useState('')
    const [isChangingPassword, setIsChangingPassword] = useState(false)

    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()

    useEffect(() => {
        const fetchUser = async () => {
            const {
                data: { user: authUser },
            } = await supabase.auth.getUser()

            if (authUser) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', authUser.id)
                    .single()

                if (userData) {
                    setUser(userData)
                }
            }

            setIsLoading(false)
        }

        fetchUser()
    }, [supabase])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPassword.length < 6) return alert('Password must be at least 6 characters')

        setIsChangingPassword(true)
        try {
            await changeOwnPassword(newPassword)
            setIsPasswordModalOpen(false)
            setNewPassword('')
            alert('Password updated successfully!')
        } catch (error: any) {
            alert(`Error: ${error.message}`)
        } finally {
            setIsChangingPassword(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white font-sans">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-[#009245] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white text-[#333333] font-sans">
            {/* Mobile sidebar backdrop */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/10 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-[#E0E0E0] transform transition-transform duration-200 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="h-16 flex items-center justify-between px-6 border-b border-[#E0E0E0]">
                        <Link href="/dashboard" className="flex items-center gap-2">
                            <img src="/logo.png" alt="CBT Logo" className="w-8 h-8 rounded-[4px]" />
                            <span className="text-lg font-bold tracking-tight text-[#333333]">Internal Portal</span>
                        </Link>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="lg:hidden text-[#666666] hover:text-[#333333]"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-6 space-y-1">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href

                            if (item.adminOnly && user?.role !== 'admin') return null

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-[4px] transition-colors duration-200 group ${isActive
                                        ? 'bg-[#E6F4EA] text-[#009245]'
                                        : 'text-[#666666] hover:bg-[#F2F2F2] hover:text-[#333333]'
                                        }`}
                                >
                                    <item.icon className={`h-4 w-4 ${isActive ? 'text-[#009245]' : 'text-[#666666] group-hover:text-[#333333]'}`} />
                                    <span className="text-[14px] font-medium">{item.name}</span>
                                </Link>
                            )
                        })}
                    </nav>

                    {/* User Profile */}
                    {user && (
                        <div className="p-4 border-t border-[#E0E0E0]">
                            <div className="bg-[#F2F2F2] rounded-[4px] p-4">
                                <p className="text-xs font-bold text-[#333333] truncate leading-none">{user.name}</p>
                                <p className="text-[11px] text-[#666666] truncate mt-1">{user.email}</p>
                                <div className="mt-2 text-[10px] font-semibold text-[#009245] uppercase tracking-wider bg-white inline-block px-1.5 py-0.5 rounded-[2px] border border-[#009245]/20">
                                    {user.role}
                                </div>

                                <div className="mt-4 flex flex-col gap-1">
                                    <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
                                        <DialogTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                className="w-full justify-start px-0 text-[#666666] hover:text-[#009245] hover:bg-transparent h-auto text-xs font-medium"
                                            >
                                                <Lock className="h-3 w-3 mr-2" />
                                                Change Password
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="rounded-[4px] border border-[#E0E0E0] p-0 overflow-hidden shadow-lg max-w-sm bg-white">
                                            <form onSubmit={handleChangePassword}>
                                                <div className="bg-[#009245] text-white p-6">
                                                    <DialogTitle className="text-xl font-bold tracking-tight">Security Portal</DialogTitle>
                                                    <DialogDescription className="text-white/80 text-xs mt-1 leading-relaxed">
                                                        Update your internal access credentials.
                                                    </DialogDescription>
                                                </div>
                                                <div className="p-6 space-y-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-semibold text-[#333333] uppercase">New Private Password</Label>
                                                        <Input
                                                            type="password"
                                                            value={newPassword}
                                                            onChange={e => setNewPassword(e.target.value)}
                                                            placeholder="••••••••"
                                                            className="rounded-[4px] border-[#E0E0E0] h-10 focus-visible:ring-1 focus-visible:ring-[#009245]"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <div className="p-6 pt-0">
                                                    <Button type="submit" disabled={isChangingPassword} className="w-full rounded-[4px] bg-[#009245] hover:bg-[#007A33] text-white h-11 font-bold text-sm shadow-sm transition-colors">
                                                        {isChangingPassword ? 'Updating...' : 'Change Password'}
                                                    </Button>
                                                </div>
                                            </form>
                                        </DialogContent>
                                    </Dialog>

                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start px-0 text-[#666666] hover:text-red-600 hover:bg-transparent h-auto text-xs font-medium"
                                        onClick={handleSignOut}
                                    >
                                        <LogOut className="h-3 w-3 mr-2" />
                                        Sign Out
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <div className="lg:pl-64">
                {/* Mobile Header */}
                <header className="h-16 border-b border-[#E0E0E0] bg-white lg:hidden sticky top-0 z-30 px-4 flex items-center justify-between">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="text-[#333333]"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <span className="font-bold text-lg text-[#333333]">Internal Portal</span>
                    <div className="w-6" />
                </header>

                {/* Page Content */}
                <main className="min-h-screen">
                    {children}
                </main>
            </div>
        </div>
    )
}
