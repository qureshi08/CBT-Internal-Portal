'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { UserRole } from '@/lib/types/database'
import { revalidatePath } from 'next/cache'

export async function createInternalUser(formData: {
    email: string;
    name: string;
    role: UserRole;
}) {
    // Standard temporary password for internal onboarding
    const tempPassword = 'CBTStaff2026!'

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: formData.email,
        password: tempPassword,
        email_confirm: true, // Automatically confirm since this is internal
        user_metadata: {
            name: formData.name,
            role: formData.role
        }
    })

    if (error) {
        console.error('SERVER ACTION ERROR (Provisioning):', {
            msg: error.message,
            code: error.code,
            status: error.status
        })
        throw new Error(error.message)
    }

    revalidatePath('/admin/users')
    return { success: true, user: data.user }
}

export async function resetUserPassword(userId: string) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: 'CBTStaff2026!'
    })

    if (error) {
        console.error('SERVER ACTION ERROR (Reset):', error)
        throw new Error(error.message)
    }

    return { success: true }
}

export async function changeOwnPassword(newPassword: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase.auth.updateUser({
        password: newPassword
    })

    if (error) {
        console.error('SERVER ACTION ERROR (Change Pwd):', error)
        throw new Error(error.message)
    }

    return { success: true }
}
