'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Notification } from '@/lib/types/database'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'
import { Bell, Check, CheckCheck, Trash2, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'unread'>('all')
    const supabase = createClient()

    useEffect(() => {
        fetchNotifications()
    }, [])

    const fetchNotifications = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            setNotifications(data || [])
        } catch (error) {
            console.error('Error fetching notifications:', error)
        } finally {
            setLoading(false)
        }
    }

    const markAsRead = async (notificationId: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId)

            if (error) throw error

            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
            )
        } catch (error) {
            console.error('Error marking notification as read:', error)
        }
    }

    const markAllAsRead = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false)

            if (error) throw error

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        } catch (error) {
            console.error('Error marking all as read:', error)
        }
    }

    const deleteNotification = async (notificationId: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId)

            if (error) throw error

            setNotifications(prev => prev.filter(n => n.id !== notificationId))
        } catch (error) {
            console.error('Error deleting notification:', error)
        }
    }

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'event_approved':
                return '✅'
            case 'event_rejected':
                return '❌'
            case 'wallet_credit':
                return '💰'
            case 'wallet_debit':
                return '📉'
            case 'event_reminder':
                return '🔔'
            case 'feedback_response':
                return '💬'
            default:
                return '🔔'
        }
    }

    const filteredNotifications = notifications.filter((n) => {
        if (filter === 'all') return true
        return !n.is_read
    })

    const unreadCount = notifications.filter(n => !n.is_read).length

    return (
        <div className="p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
                <p className="text-gray-600">Stay updated with all your activities</p>
            </div>

            {/* Actions Bar */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-md font-medium transition-colors ${filter === 'all'
                                ? 'bg-[#009245] text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        All ({notifications.length})
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={`px-4 py-2 rounded-md font-medium transition-colors ${filter === 'unread'
                                ? 'bg-[#009245] text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Unread ({unreadCount})
                    </button>
                </div>

                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-[#009245] hover:underline"
                    >
                        <CheckCheck className="w-4 h-4" />
                        Mark all as read
                    </button>
                )}
            </div>

            {/* Notifications List */}
            {loading ? (
                <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                </div>
            ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">
                        {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                        {filter === 'unread' ? 'You\'re all caught up!' : 'We\'ll notify you when something happens'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredNotifications.map((notification) => (
                        <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-all ${!notification.is_read ? 'border-l-4 border-l-[#009245]' : ''
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                <span className="text-3xl flex-shrink-0">
                                    {getNotificationIcon(notification.type)}
                                </span>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <h3 className="font-semibold text-gray-900">
                                            {notification.title}
                                        </h3>
                                        {!notification.is_read && (
                                            <span className="w-2 h-2 bg-[#009245] rounded-full flex-shrink-0 mt-2"></span>
                                        )}
                                    </div>

                                    <p className="text-gray-700 mb-3">{notification.message}</p>

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500">
                                            {formatDistanceToNow(new Date(notification.created_at), {
                                                addSuffix: true,
                                            })}
                                        </span>

                                        <div className="flex items-center gap-2">
                                            {notification.link && (
                                                <Link
                                                    href={notification.link}
                                                    onClick={() => markAsRead(notification.id)}
                                                    className="text-sm text-[#009245] hover:underline font-medium"
                                                >
                                                    View Details →
                                                </Link>
                                            )}

                                            {!notification.is_read && (
                                                <button
                                                    onClick={() => markAsRead(notification.id)}
                                                    className="p-2 text-[#009245] hover:bg-green-50 rounded transition-colors"
                                                    title="Mark as read"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => deleteNotification(notification.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    )
}
