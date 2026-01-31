'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { User, UserRole } from '@/lib/types/database'
import { Loader2, UserPlus, ShieldPlus, KeyRound } from 'lucide-react'

import { createInternalUser, resetUserPassword } from './actions'

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    // Form state
    const [email, setEmail] = useState('')
    const [name, setName] = useState('')
    const [role, setRole] = useState<UserRole>('employee')

    const supabase = createClient()

    const fetchUsers = async () => {
        setIsLoading(true)
        const { data } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false })

        if (data) setUsers(data)
        setIsLoading(false)
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            await createInternalUser({
                email,
                name,
                role
            })

            setIsDialogOpen(false)
            setEmail('')
            setName('')
            setRole('employee')

            // Wait for trigger and revalidation
            setTimeout(() => fetchUsers(), 1500)

            alert('User provisioned successfully.\n\nDefault Login Password: CBTStaff2026!\n(Please share this with the staff member)')
        } catch (error: any) {
            alert(`Provisioning Failed: ${error.message}`)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleResetPassword = async (userId: string, name: string) => {
        if (!confirm(`Reset password for ${name} to default 'CBTStaff2026!'?`)) return

        try {
            await resetUserPassword(userId)
            alert(`Password for ${name} has been reset to: CBTStaff2026!`)
        } catch (error: any) {
            alert(`Reset Failed: ${error.message}`)
        }
    }

    if (isLoading && users.length === 0) {
        return (
            <div className="p-12 flex justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-[#009245]" />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-10 font-sans max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#E0E0E0] pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#333333]">User Management</h1>
                    <p className="text-[#666666] text-sm mt-1">Administrative panel for system access control.</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="rounded-[4px] bg-[#009245] hover:bg-[#007A33] text-white font-semibold text-sm h-10 px-5 shadow-sm transition-colors">
                            <UserPlus className="h-4 w-4 mr-1.5" /> Register New Access
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[4px] border border-[#E0E0E0] p-0 overflow-hidden shadow-lg max-w-sm bg-white">
                        <form onSubmit={handleCreateUser}>
                            <div className="bg-[#009245] text-white p-7">
                                <DialogTitle className="text-xl font-bold tracking-tight">System Registry</DialogTitle>
                                <DialogDescription className="text-white/80 text-xs mt-1 leading-relaxed">
                                    Create a new internal account with verified credentials.
                                </DialogDescription>
                            </div>
                            <div className="p-8 space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-[#333333] uppercase">Identity Name</Label>
                                    <Input
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="Full Name"
                                        className="rounded-[4px] border-[#E0E0E0] h-10 focus-visible:ring-1 focus-visible:ring-[#009245]"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-[#333333] uppercase">Email Identity</Label>
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="user@cbt.com"
                                        className="rounded-[4px] border-[#E0E0E0] h-10 focus-visible:ring-1 focus-visible:ring-[#009245]"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-[#333333] uppercase">System Role</Label>
                                    <Select value={role} onValueChange={(v: any) => setRole(v)}>
                                        <SelectTrigger className="rounded-[4px] border border-[#E0E0E0] h-10 focus:ring-1 focus:ring-[#009245] font-medium text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-[4px] border border-[#E0E0E0]">
                                            <SelectItem value="employee">EMPLOYEE</SelectItem>
                                            <SelectItem value="approver">APPROVER</SelectItem>
                                            <SelectItem value="admin">ADMIN</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="p-8 pt-0">
                                <Button type="submit" disabled={isSubmitting} className="w-full rounded-[4px] bg-[#009245] hover:bg-[#007A33] text-white h-11 font-bold text-sm shadow-sm transition-colors">
                                    {isSubmitting ? 'Registering...' : 'Provision Account'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-[4px] border border-[#E0E0E0] bg-white overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-[#F2F2F2]">
                        <TableRow className="border-b border-[#E0E0E0] hover:bg-transparent">
                            <TableHead className="text-[#333333] font-bold text-xs h-11 px-6">Account Name</TableHead>
                            <TableHead className="text-[#333333] font-bold text-xs h-11 px-6">Email Address</TableHead>
                            <TableHead className="text-[#333333] font-bold text-xs h-11 px-6">Role Assignment</TableHead>
                            <TableHead className="text-right text-[#333333] font-bold text-xs h-11 px-6">Registered On</TableHead>
                            <TableHead className="text-right text-[#333333] font-bold text-xs h-11 px-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((u) => (
                            <TableRow key={u.id} className="border-b border-[#E0E0E0] last:border-0 hover:bg-[#F2F2F2]/50 transition-colors">
                                <TableCell className="font-bold text-sm text-[#333333] px-6 py-4">{u.name}</TableCell>
                                <TableCell className="text-xs text-[#666666] px-6 py-4">{u.email}</TableCell>
                                <TableCell className="px-6 py-4">
                                    <span className="inline-block px-2.5 py-0.5 rounded-[2px] text-[10px] font-bold uppercase tracking-wider border border-[#009245]/30 text-[#009245] bg-[#E6F4EA]">
                                        {u.role}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right text-[11px] font-medium text-[#666666] px-6 py-4 whitespace-nowrap">
                                    {new Date(u.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                </TableCell>
                                <TableCell className="text-right px-6 py-4">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-[#666666] hover:text-[#009245]"
                                        onClick={() => handleResetPassword(u.id, u.name)}
                                        title="Reset Password to Default"
                                    >
                                        <KeyRound className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-start gap-4 border border-[#009245]/20 rounded-[4px] p-6 bg-[#E6F4EA]">
                <ShieldPlus className="h-5 w-5 text-[#009245] mt-0.5" />
                <div className="space-y-1">
                    <p className="text-xs font-bold text-[#009245] uppercase tracking-wide">Administrative Compliance</p>
                    <p className="text-xs font-medium text-[#009245]/80 leading-relaxed">
                        Provisioning accounts here automatically initializes a corresponding digital wallet and audit trail. Users must finalize account ownership via the secure verification email sent upon registration.
                    </p>
                </div>
            </div>
        </div>
    )
}
