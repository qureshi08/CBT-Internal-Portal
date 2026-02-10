'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Feedback, FeedbackType, FeedbackStatus } from '@/lib/types/database'
import { MessageSquare, AlertCircle, Lightbulb, Send, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'

export default function FeedbackPage() {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [formData, setFormData] = useState({
        type: 'suggestion' as FeedbackType,
        subject: '',
        description: '',
    })

    const supabase = createClient()

    useEffect(() => {
        fetchFeedback()
    }, [])

    const fetchFeedback = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('feedback')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            setFeedbacks(data || [])
        } catch (error) {
            console.error('Error fetching feedback:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('feedback')
                .insert({
                    user_id: user.id,
                    type: formData.type,
                    subject: formData.subject,
                    description: formData.description,
                })

            if (error) throw error

            // Reset form
            setFormData({
                type: 'suggestion',
                subject: '',
                description: '',
            })
            setShowForm(false)
            fetchFeedback()
        } catch (error) {
            console.error('Error submitting feedback:', error)
            alert('Failed to submit feedback')
        } finally {
            setSubmitting(false)
        }
    }

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

    return (
        <div className="p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Feedback Center</h1>
                <p className="text-gray-600">Share your complaints or suggestions to help us improve</p>
            </div>

            {/* Submit New Feedback Button */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowForm(!showForm)}
                className="mb-6 px-6 py-3 bg-[#009245] text-white rounded-md hover:bg-[#007a39] transition-colors flex items-center gap-2 font-medium"
            >
                <MessageSquare className="w-5 h-5" />
                {showForm ? 'Cancel' : 'Submit New Feedback'}
            </motion.button>

            {/* Feedback Form */}
            {showForm && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm"
                >
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Type Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Type
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'complaint' })}
                                    className={`p-4 rounded-lg border-2 transition-all ${formData.type === 'complaint'
                                            ? 'border-[#009245] bg-green-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
                                    <div className="font-medium">Complaint</div>
                                    <div className="text-xs text-gray-500">Report an issue</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'suggestion' })}
                                    className={`p-4 rounded-lg border-2 transition-all ${formData.type === 'suggestion'
                                            ? 'border-[#009245] bg-green-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <Lightbulb className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                                    <div className="font-medium">Suggestion</div>
                                    <div className="text-xs text-gray-500">Share an idea</div>
                                </button>
                            </div>
                        </div>

                        {/* Subject */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Subject
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009245] focus:border-transparent"
                                placeholder="Brief summary of your feedback"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description
                            </label>
                            <textarea
                                required
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={5}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009245] focus:border-transparent"
                                placeholder="Provide detailed information..."
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3 bg-[#009245] text-white rounded-md hover:bg-[#007a39] transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Submit Feedback
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>
            )}

            {/* Feedback List */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Feedback History</h2>

                {loading ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                    </div>
                ) : feedbacks.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500">No feedback submitted yet</p>
                        <p className="text-sm text-gray-400 mt-1">Click the button above to get started</p>
                    </div>
                ) : (
                    feedbacks.map((feedback) => (
                        <motion.div
                            key={feedback.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    {feedback.type === 'complaint' ? (
                                        <AlertCircle className="w-6 h-6 text-red-500" />
                                    ) : (
                                        <Lightbulb className="w-6 h-6 text-yellow-500" />
                                    )}
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{feedback.subject}</h3>
                                        <p className="text-sm text-gray-500">
                                            {formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(feedback.status)}`}>
                                    {getStatusLabel(feedback.status)}
                                </span>
                            </div>

                            <p className="text-gray-700 mb-4">{feedback.description}</p>

                            {feedback.admin_response && (
                                <div className="bg-green-50 border-l-4 border-[#009245] p-4 rounded">
                                    <div className="flex items-start gap-2">
                                        <div className="flex-shrink-0 text-[#009245]">
                                            <MessageSquare className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 text-sm mb-1">Admin Response:</p>
                                            <p className="text-gray-700 text-sm">{feedback.admin_response}</p>
                                            {feedback.responded_at && (
                                                <p className="text-xs text-gray-500 mt-2">
                                                    Responded {formatDistanceToNow(new Date(feedback.responded_at), { addSuffix: true })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    )
}
