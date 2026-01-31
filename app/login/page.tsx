'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (signInError) throw signInError

            router.push('/dashboard')
        } catch (err: any) {
            setError(err.message || 'Invalid login credentials')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-white p-4 font-sans">
            <Card className="w-full max-w-sm rounded-[4px] border border-[#E0E0E0] shadow-sm">
                <CardHeader className="space-y-4 text-center pt-8 pb-4">
                    <div className="flex justify-center">
                        <img src="/logo.png" alt="CBT Logo" className="w-16 h-16 rounded-[4px] shadow-sm" />
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold tracking-tight text-[#333333]">
                            Internal Portal
                        </CardTitle>
                        <CardDescription className="text-[#666666] text-sm">
                            Internal Operations Portal
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="pb-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium text-[#333333]">
                                Email Address
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@cbt.com"
                                className="rounded-[4px] border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#009245] placeholder:text-[#999999]"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium text-[#333333]">
                                Password
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                className="rounded-[4px] border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#009245] placeholder:text-[#999999]"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>

                        {error && (
                            <div className="p-3 text-xs font-medium text-red-600 border border-red-100 bg-red-50 rounded-[4px] text-center">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full rounded-[4px] bg-[#009245] hover:bg-[#007A33] text-white font-semibold text-sm h-11 transition-colors"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </Button>

                        <p className="text-xs text-center text-[#666666]">
                            Access restricted to authorized personnel. <br />
                            Contact Admin for account creation.
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
