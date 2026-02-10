'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FeedbackWithUser, FeedbackStatus, User } from '@/lib/types/database'
import { MessageSquare, AlertCircle, Lightbulb, Loader2, Send, Filter } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'

export default function AdminFeedbackPage() {
    const [feedbacks, setFeedbacks] = useState<FeedbackWithUser[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved'>('all')
    const [selectedFeedback, setSelectedFeedback] = useState<FeedbackWithUser | null>(null)
    const [responding, setResponding] = useState(false)
    const [responseData, setResponseData] = useState({
        status: 'pending' as FeedbackStatus,
        admin_response: '',
    })

    const supabase = createClient()

    useEffect(() => {
        fetchFeedback()
    }, [])

    const fetchFeedback = async () => {
        try {
            const { data, error } = await supabase
                .from('feedback')
                .select(`
                    *,
                    user:users!feedback_user_id_fkey(id, name, email),
                    responder:users!feedback_responded_by_fkey(id, name, email)
                `)
                .order('created_at', { ascending: false })

            if (error) throw error

            setFeedbacks(data as any || [])
        } catch (error) {
            console.error('Error fetching feedback:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleRespond = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedFeedback) return

        setResponding(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('feedback')
                .update({
                    status: responseData.status,
                    admin_response: responseData.admin_response,
                    responded_by: user.id,
                    responded_at: new Date().toISOString(),
                })
                .eq('id', selectedFeedback.id)

            if (error) throw error

            setSelectedFeedback(null)
            setResponseData({ status: 'pending', admin_response: '' })
            fetchFeedback()
        } catch (error) {
            console.error('Error responding to feedback:', error)
            alert('Failed to submit response')
        } finally {
            setResponding(false)
        }
    }

    const openResponseModal = (feedback: FeedbackWithUser) => {
        setSelectedFeedback(feedback)
        setResponseData({
            status: feedback.status,
            admin_response: feedback.admin_response || '',
        })
    }

    const filteredFeedbacks = feedbacks.filter((fb) => {
        if (filter === 'all') return true
        return fb.status === filter
    })

    const getStatusColor = (status: FeedbackStatus) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800'
            case 'in_progress':
                return 'bg-blue-100 text-blue-800'
            case 'resolved':
                return 'bg-green-100 text-green-800'
            case 'closed':
                return 'bg-gray-100 text-gray-800'
        }
    }

    const getStatusLabel = (status: FeedbackStatus) => {
        switch (status) {
            case 'pending':
                return 'Pending'
            case 'in_progress':
                return 'In Progress'
            case 'resolved':
                return 'Resolved'
            case 'closed':
                return 'Closed'
        }
    }

    const stats = {
        total: feedbacks.length,
        pending: feedbacks.filter((f) => f.status === 'pending').length,
        inProgress: feedbacks.filter((f) => f.status === 'in_progress').length,
        resolved: feedbacks.filter((f) => f.status === 'resolved').length,
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Feedback Management</h1>
                <p className="text-gray-600">Review and respond to employee feedback</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                    <div className="text-sm text-gray-600">Total Feedback</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-900">{stats.pending}</div>
                    <div className="text-sm text-yellow-700">Pending</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-900">{stats.inProgress}</div>
                    <div className="text-sm text-blue-700">In Progress</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-900">{stats.resolved}</div>
                    <div className="text-sm text-green-700">Resolved</div>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-6 flex gap-2">
                {(['all', 'pending', 'in_progress', 'resolved'] as const).map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-md font-medium transition-colors ${filter === status
                                ? 'bg-[#009245] text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {status === 'all' ? 'All' : getStatusLabel(status)}
                    </button>
                ))}
            </div>

            {/* Feedback List */}
            {loading ? (
                <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                </div>
            ) : filteredFeedbacks.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">No feedback found</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredFeedbacks.map((feedback) => (
                        <motion.div
                            key={feedback.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-start gap-3 flex-1">
                                    {feedback.type === 'complaint' ? (
                                        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                                    ) : (
                                        <Lightbulb className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                                    )}
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{feedback.subject}</h3>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    By: <span className="font-medium">{feedback.user.name}</span> ({feedback.user.email})
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true })}
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(feedback.status)}`}>
                                                {getStatusLabel(feedback.status)}
                                            </span>
                                        </div>
                                        <p className="text-gray-700 mt-3">{feedback.description}</p>

                                        {feedback.admin_response && (
                                            <div className="bg-green-50 border-l-4 border-[#009245] p-4 rounded mt-3">
                                                <p className="font-medium text-gray-900 text-sm mb-1">Your Response:</p>
                                                <p className="text-gray-700 text-sm">{feedback.admin_response}</p>
                                                {feedback.responded_at && feedback.responder && (
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        By {feedback.responder.name} - {formatDistanceToNow(new Date(feedback.responded_at), { addSuffix: true })}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <button
                                            onClick={() => openResponseModal(feedback)}
                                            className="mt-4 px-4 py-2 bg-[#009245] text-white rounded-md hover:bg-[#007a39] transition-colors text-sm font-medium"
                                        >
                                            {feedback.admin_response ? 'Update Response' : 'Respond'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Response Modal */}
            <AnimatePresence>
                {selectedFeedback && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-6 border-b border-gray-200">
                                <h2 className="text-xl font-bold text-gray-900">Respond to Feedback</h2>
                                <p className="text-sm text-gray-600 mt-1">{selectedFeedback.subject}</p>
                            </div>

                            <form onSubmit={handleRespond} className="p-6 space-y-4">
                                {/* Original Feedback */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Original Feedback:</p>
                                    <p className="text-gray-900">{selectedFeedback.description}</p>
                                    <p className="text-sm text-gray-600 mt-2">
                                        From: {selectedFeedback.user.name} ({selectedFeedback.user.email})
                                    </p>
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Status
                                    </label>
                                    <select
                                        value={responseData.status}
                                        onChange={(e) => setResponseData({ ...responseData, status: e.target.value as FeedbackStatus })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009245] focus:border-transparent"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                </div>

                                {/* Response */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Your Response
                                    </label>
                                    <textarea
                                        required
                                        value={responseData.admin_response}
                                        onChange={(e) => setResponseData({ ...responseData, admin_response: e.target.value })}
                                        rows={5}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009245] focus:border-transparent"
                                        placeholder="Type your response here..."
                                    />
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        disabled={responding}
                                        className="flex-1 py-3 bg-[#009245] text-white rounded-md hover:bg-[#007a39] transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {responding ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5" />
                                                Submit Response
                                            </>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedFeedback(null)}
                                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium"
                                        disabled={responding}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
