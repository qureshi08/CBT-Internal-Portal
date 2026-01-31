'use client'

import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isWithinInterval,
    startOfDay,
    endOfDay
} from 'date-fns'
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon, Clock, MapPin, AlignLeft, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Event } from '@/lib/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

// Professional color palette for events
const EVENT_COLORS = [
    { bg: 'bg-[#009245]', border: 'border-[#007A33]', text: 'text-white' }, // CBT Green
    { bg: 'bg-[#3366FF]', border: 'border-[#2952CC]', text: 'text-white' }, // Blue
    { bg: 'bg-[#8E44AD]', border: 'border-[#73378B]', text: 'text-white' }, // Purple
    { bg: 'bg-[#D35400]', border: 'border-[#A94400]', text: 'text-white' }, // Orange
    { bg: 'bg-[#1ABC9C]', border: 'border-[#16A085]', text: 'text-white' }, // Teal
    { bg: 'bg-[#2C3E50]', border: 'border-[#1A252F]', text: 'text-white' }, // Dark Slate
]

export default function CalendarPage() {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [events, setEvents] = useState<Event[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
    const supabase = createClient()

    useEffect(() => {
        const fetchEvents = async () => {
            setIsLoading(true)
            const start = startOfWeek(startOfMonth(currentMonth)).toISOString()
            const end = endOfWeek(endOfMonth(currentMonth)).toISOString()

            // Fetch events that overlap with the visible calendar range
            const { data } = await supabase
                .from('events')
                .select('*')
                .eq('status', 'approved')
                .lte('start_time', end)
                .gte('end_time', start)

            if (data) setEvents(data)
            setIsLoading(false)
        }

        fetchEvents()
    }, [currentMonth, supabase])

    const getEventColor = (eventId: string) => {
        // Deterministic index based on the first few chars of UUID
        const index = parseInt(eventId.substring(0, 2), 16) % EVENT_COLORS.length
        return EVENT_COLORS[index]
    }

    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

    if (isLoading && events.length === 0) {
        return (
            <div className="p-12 flex justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-[#009245]" />
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 space-y-4 md:space-y-6 font-sans max-w-[1400px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E0E0E0] pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#333333]">Office Calendar</h1>
                    <p className="text-[#666666] text-xs mt-0.5">Confirmed events and multi-day activity schedules.</p>
                </div>

                <div className="flex items-center gap-2 bg-white border border-[#E0E0E0] rounded-[4px] p-0.5 shadow-sm self-start md:self-auto">
                    <button
                        onClick={prevMonth}
                        className="p-1.5 hover:bg-[#F2F2F2] rounded-[4px] transition-colors"
                    >
                        <ChevronLeft className="h-3.5 w-3.5 text-[#333333]" />
                    </button>
                    <span className="text-xs font-bold text-[#333333] px-2 min-w-[120px] text-center uppercase tracking-wide">
                        {format(currentMonth, 'MMMM yyyy')}
                    </span>
                    <button
                        onClick={nextMonth}
                        className="p-1.5 hover:bg-[#F2F2F2] rounded-[4px] transition-colors"
                    >
                        <ChevronRight className="h-3.5 w-3.5 text-[#333333]" />
                    </button>
                </div>
            </div>

            <div className="rounded-[4px] border border-[#E0E0E0] bg-white overflow-hidden shadow-sm">
                <div className="grid grid-cols-7 border-b border-[#E0E0E0] bg-[#F2F2F2]">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="p-2 text-[10px] font-bold text-[#666666] text-center uppercase tracking-tighter sm:tracking-normal">
                            <span className="hidden sm:inline">{day}</span>
                            <span className="sm:hidden">{day[0]}</span>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7">
                    {calendarDays.map((day) => {
                        const isCurrentMonth = isSameMonth(day, monthStart)
                        const isToday = isSameDay(day, new Date())

                        const dayEvents = events.filter(e => {
                            const start = startOfDay(new Date(e.start_time))
                            const end = endOfDay(new Date(e.end_time))
                            return isWithinInterval(day, { start, end })
                        })

                        return (
                            <div
                                key={day.toString()}
                                className={`min-h-[70px] sm:min-h-[85px] p-1 sm:p-1.5 border-r border-b border-[#E0E0E0] last:border-r-0 flex flex-col gap-0.5 sm:gap-1 transition-colors ${!isCurrentMonth ? 'bg-gray-50/20' : 'bg-white'
                                    } hover:bg-[#F2F2F2]/30`}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={`text-[9px] sm:text-[10px] font-bold rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center transition-colors ${isToday
                                        ? 'bg-[#009245] text-white shadow-sm'
                                        : isCurrentMonth ? 'text-[#333333]' : 'text-[#666666]/30'
                                        }`}>
                                        {format(day, 'd')}
                                    </span>
                                </div>

                                <div className="flex flex-col gap-0.5 sm:gap-1 overflow-y-auto max-h-[50px] sm:max-h-[60px] scrollbar-hide py-0.5">
                                    {dayEvents.map(event => {
                                        const color = getEventColor(event.id)
                                        return (
                                            <button
                                                key={event.id}
                                                onClick={() => setSelectedEvent(event)}
                                                className={`w-full text-left ${color.bg} ${color.text} px-1 sm:px-2 py-0.5 sm:py-1 rounded-[1px] sm:rounded-[2px] text-[8px] sm:text-[10px] font-bold leading-tight shadow-sm border-l-2 sm:border-l-4 ${color.border} hover:brightness-95 transition-all truncate`}
                                            >
                                                {event.title}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Event Detail Modal */}
            <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
                <DialogContent className="rounded-[4px] border border-[#E0E0E0] p-0 overflow-hidden shadow-lg max-w-[90vw] sm:max-w-md bg-white">
                    {selectedEvent && (
                        <div className="max-h-[80vh] overflow-y-auto">
                            <div className={`${getEventColor(selectedEvent.id).bg} text-white p-6 sm:p-8 relative`}>
                                <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight pr-8">
                                    {selectedEvent.title}
                                </DialogTitle>
                                <div className="mt-2 flex items-center gap-2 text-white/80 font-bold text-[10px] uppercase tracking-widest">
                                    <div className="bg-white/20 px-2 py-0.5 rounded-[2px]">Approved Activity</div>
                                </div>
                            </div>

                            <div className="p-6 sm:p-8 space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="bg-[#F2F2F2] p-2 rounded-[4px]">
                                        <Clock className="h-4 w-4 text-[#333333]" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-[#666666] uppercase tracking-wider">Schedule Detail</p>
                                        <div className="text-sm font-bold text-[#333333] space-y-0.5">
                                            <p>{format(new Date(selectedEvent.start_time), 'EEEE, MMMM do')}</p>
                                            <p className="text-xs text-[#666666]">
                                                {format(new Date(selectedEvent.start_time), 'p')} — {format(new Date(selectedEvent.end_time), 'p')}
                                                {format(new Date(selectedEvent.start_time), 'yyyyMMdd') !== format(new Date(selectedEvent.end_time), 'yyyyMMdd') &&
                                                    ` (Ends ${format(new Date(selectedEvent.end_time), 'MMM d')})`
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {selectedEvent.description && (
                                    <div className="flex items-start gap-4">
                                        <div className="bg-[#F2F2F2] p-2 rounded-[4px]">
                                            <AlignLeft className="h-4 w-4 text-[#333333]" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-[#666666] uppercase tracking-wider">Description</p>
                                            <p className="text-sm font-medium text-[#333333] leading-relaxed">
                                                {selectedEvent.description}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {selectedEvent.approval_remarks && (
                                    <div className="flex items-start gap-4 border-t border-[#E0E0E0] pt-6">
                                        <div className="bg-[#E6F4EA] p-2 rounded-[4px]">
                                            <Info className="h-4 w-4 text-[#009245]" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-[#009245] uppercase tracking-wider">Internal Notes</p>
                                            <p className="text-sm font-medium text-[#009245] italic">
                                                "{selectedEvent.approval_remarks}"
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <Button
                                    onClick={() => setSelectedEvent(null)}
                                    className="w-full rounded-[4px] border border-[#E0E0E0] bg-white text-[#333333] hover:bg-[#F2F2F2] font-bold text-[10px] uppercase tracking-widest h-12 transition-colors mt-4"
                                >
                                    Close Portal View
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <div className="bg-[#E6F4EA] border border-[#009245]/20 rounded-[4px] p-4 sm:p-6 flex items-start gap-4">
                <Info className="h-5 w-5 text-[#009245] mt-0.5 hidden sm:block" />
                <div className="space-y-1">
                    <p className="text-[10px] sm:text-xs font-bold text-[#009245] uppercase tracking-wide">Live Office Schedule</p>
                    <p className="text-[10px] sm:text-xs font-medium text-[#009245]/80 leading-relaxed">
                        This calendar tracks all approved office activities. Click on any event block to view detailed logistics, schedules, and administrative remarks.
                    </p>
                </div>
            </div>
        </div>
    )
}
