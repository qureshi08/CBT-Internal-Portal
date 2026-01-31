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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Event, User, EventStatus } from '@/lib/types/database'
import { Loader2, Plus, Check, X, FileText, Info, AlertTriangle, Clock, AlignLeft, Wallet, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [budget, setBudget] = useState('')

  const supabase = createClient()

  const fetchData = async () => {
    setIsLoading(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (userData) setUser(userData)

    // Fetch all events to check for overlaps
    const { data: eventsData } = await supabase.from('events').select(`
            *,
            creator:users!events_created_by_fkey(name)
        `).order('created_at', { ascending: false })

    if (eventsData) setEvents(eventsData as any)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const checkOverlap = (start: string, end: string, excludeId?: string) => {
    const newStart = new Date(start)
    const newEnd = new Date(end)

    return events.filter(e => {
      if (e.id === excludeId || e.status !== 'approved') return false

      const eStart = new Date(e.start_time)
      const eEnd = new Date(e.end_time)

      return (newStart < eEnd && newEnd > eStart)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const overlaps = checkOverlap(startTime, endTime)
    if (overlaps.length > 0) {
      if (!confirm(`Warning: This event overlaps with ${overlaps.length} approved event(s). Do you still want to submit?`)) {
        return
      }
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('events').insert({
        title,
        description,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        budget: budget ? parseFloat(budget) : null,
        created_by: user.id
      })

      if (error) throw error

      setIsDialogOpen(false)
      setTitle('')
      setDescription('')
      setStartTime('')
      setEndTime('')
      setBudget('')
      fetchData()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateStatus = (e: React.MouseEvent, eventId: string, status: EventStatus, currentEvent: Event) => {
    e.stopPropagation() // Prevent row click
    if (!user || user.role === 'employee') return

    approveProcess(eventId, status, currentEvent)
  }

  const approveProcess = async (eventId: string, status: EventStatus, currentEvent: Event) => {
    if (!user) return

    if (status === 'approved') {
      const overlaps = checkOverlap(currentEvent.start_time, currentEvent.end_time, eventId)
      if (overlaps.length > 0) {
        if (!confirm(`CRITICAL WARNING: This event overlaps with already approved events:\n${overlaps.map(o => `• ${o.title}`).join('\n')}\n\nAre you absolutely sure you want to approve this overlap?`)) {
          return
        }
      }
    }

    try {
      const remarks = prompt(`Enter optional remarks for ${status}:`)
      if (remarks === null) return

      const { error } = await supabase
        .from('events')
        .update({
          status,
          approved_by: user.id,
          approval_remarks: remarks
        })
        .eq('id', eventId)

      if (error) throw error
      fetchData()
      setSelectedEvent(null) // Close detail view if open
    } catch (error: any) {
      alert(error.message)
    }
  }

  if (isLoading && events.length === 0) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-[#009245]" />
      </div>
    )
  }

  const displayEvents = user?.role === 'employee'
    ? events.filter(e => e.created_by === user.id || e.status === 'approved')
    : events

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-10 font-sans max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#E0E0E0] pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#333333]">Event Requests</h1>
          <p className="text-[#666666] text-xs md:text-sm mt-1">Proposal ledger and flexible schedule management.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto rounded-[4px] bg-[#009245] hover:bg-[#007A33] text-white font-semibold text-sm h-10 px-5 shadow-sm transition-colors">
              <Plus className="h-4 w-4 mr-1.5" /> Submit New Proposal
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[4px] border border-[#E0E0E0] p-0 overflow-hidden shadow-lg max-w-[90vw] md:max-w-lg bg-white">
            <form onSubmit={handleSubmit}>
              <div className="bg-[#009245] text-white p-6 md:p-8">
                <DialogTitle className="text-xl md:text-2xl font-bold tracking-tight">Propose Office Event</DialogTitle>
                <DialogDescription className="text-white/80 text-[10px] md:text-xs mt-1 leading-relaxed">
                  Fill in the logistics details below for review by the management team.
                </DialogDescription>
              </div>
              <div className="p-6 md:p-8 space-y-5 max-h-[60vh] overflow-y-auto">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-[#333333] uppercase">Event Title</Label>
                  <Input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Monthly Lunch"
                    className="rounded-[4px] border-[#E0E0E0] h-10 focus-visible:ring-1 focus-visible:ring-[#009245]"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-[#333333] uppercase">Start Time</Label>
                    <Input
                      type="datetime-local"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="rounded-[4px] border-[#E0E0E0] h-10 focus-visible:ring-1 focus-visible:ring-[#009245]"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-[#333333] uppercase">End Time</Label>
                    <Input
                      type="datetime-local"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="rounded-[4px] border-[#E0E0E0] h-10 focus-visible:ring-1 focus-visible:ring-[#009245]"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-[#333333] uppercase">Estimated Budget (Rs.)</Label>
                  <Input
                    type="number"
                    value={budget}
                    onChange={e => setBudget(e.target.value)}
                    placeholder="0.00"
                    className="rounded-[4px] border-[#E0E0E0] h-10 focus-visible:ring-1 focus-visible:ring-[#009245] font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-[#333333] uppercase">Description</Label>
                  <Textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Provide event details..."
                    className="rounded-[4px] border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#009245] h-24"
                  />
                </div>
              </div>
              <div className="p-6 md:p-8 pt-0 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-[4px] border-[#E0E0E0] font-semibold text-xs h-11"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-[4px] bg-[#009245] text-white font-bold h-11 shadow-sm transition-colors"
                >
                  {isSubmitting ? '...' : 'Confirm'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-[4px] border border-[#E0E0E0] bg-white overflow-hidden shadow-sm overflow-x-auto">
        <Table>
          <TableHeader className="bg-[#F2F2F2]">
            <TableRow className="border-b border-[#E0E0E0] hover:bg-transparent">
              <TableHead className="text-[#333333] font-bold text-xs h-11 px-4 md:px-6 min-w-[150px]">Event & Requester</TableHead>
              <TableHead className="text-[#333333] font-bold text-xs h-11 px-4 md:px-6 min-w-[150px]">Scheduled For</TableHead>
              <TableHead className="text-[#333333] font-bold text-xs h-11 px-4 md:px-6">Status</TableHead>
              <TableHead className="text-right text-[#333333] font-bold text-xs h-11 px-4 md:px-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-20 text-sm text-[#666666] italic">
                  No event requests found.
                </TableCell>
              </TableRow>
            ) : (
              displayEvents.map((e: any) => {
                const overlaps = e.status === 'pending' ? checkOverlap(e.start_time, e.end_time, e.id) : []
                const hasOverlap = overlaps.length > 0

                return (
                  <TableRow
                    key={e.id}
                    className="border-b border-[#E0E0E0] last:border-0 hover:bg-[#F2F2F2]/50 transition-colors cursor-pointer group"
                    onClick={() => setSelectedEvent(e)}
                  >
                    <TableCell className="px-4 md:px-6 py-4 md:py-5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs md:text-sm text-[#333333] tracking-tight group-hover:text-[#009245] transition-colors">{e.title}</span>
                          {hasOverlap && (
                            <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-1 py-0.5 rounded-[2px] text-[8px] md:text-[9px] font-bold border border-amber-200">
                              <AlertTriangle className="h-2 w-2 md:h-2.5 md:w-2.5" /> OVERLAP
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] md:text-[11px] font-medium text-[#666666] mt-0.5 uppercase tracking-wide">By: {e.creator?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 md:px-6 py-4 md:py-5">
                      <div className="flex flex-col">
                        <span className="text-[11px] md:text-xs font-bold text-[#333333]">
                          {format(new Date(e.start_time), 'MMM d, yyyy')}
                        </span>
                        <span className="text-[10px] md:text-[11px] font-medium text-[#666666] mt-0.5">
                          {format(new Date(e.start_time), 'p')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 md:px-6 py-4 md:py-5">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-block px-2 py-0.5 rounded-[2px] text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-center w-fit ${e.status === 'approved' ? 'bg-[#E6F4EA] text-[#009245]' :
                          e.status === 'rejected' ? 'bg-red-50 text-red-600' :
                            'bg-[#F2F2F2] text-[#666666]'
                          }`}>
                          {e.status}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-4 md:px-6 py-4 md:py-5">
                      <div className="flex justify-end items-center gap-2">
                        {user?.role !== 'employee' && e.status === 'pending' ? (
                          <div className="flex gap-1">
                            <Button size="sm" className="h-7 w-7 p-0 rounded-full bg-[#E6F4EA] text-[#009245]" onClick={(event) => handleUpdateStatus(event, e.id, 'approved', e)}><Check className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" className="h-7 w-7 p-0 rounded-full bg-red-50 text-red-600" onClick={(event) => handleUpdateStatus(event, e.id, 'rejected', e)}><X className="h-3.5 w-3.5" /></Button>
                          </div>
                        ) : (
                          <ChevronRight className="h-4 w-4 text-[#E0E0E0] group-hover:text-[#009245] transition-colors" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="rounded-[4px] border border-[#E0E0E0] p-0 overflow-hidden shadow-lg max-w-[90vw] md:max-w-md bg-white">
          {selectedEvent && (
            <div className="max-h-[85vh] overflow-y-auto">
              <div className="bg-[#009245] text-white p-6 md:p-8 relative">
                <DialogTitle className="text-xl md:text-2xl font-bold tracking-tight pr-8">
                  {selectedEvent.title}
                </DialogTitle>
                <div className="mt-2 flex items-center gap-2 text-white/80 font-bold text-[10px] uppercase tracking-widest">
                  <div className="bg-white/20 px-2 py-0.5 rounded-[2px]">{selectedEvent.status} Request</div>
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-6">
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
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-[#F2F2F2] p-2 rounded-[4px]">
                    <Wallet className="h-4 w-4 text-[#333333]" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-[#666666] uppercase tracking-wider">Estimated Budget</p>
                    <p className="text-sm font-bold text-[#333333]">
                      Rs. {selectedEvent.budget?.toLocaleString() || '0.00'}
                    </p>
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
                      <p className="text-[10px] font-bold text-[#009245] uppercase tracking-wider">Administrative Remarks</p>
                      <p className="text-sm font-medium text-[#009245] italic">
                        "{selectedEvent.approval_remarks}"
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8 pt-0 flex flex-col sm:flex-row gap-3">
                {user?.role !== 'employee' && selectedEvent.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => approveProcess(selectedEvent.id, 'approved', selectedEvent)}
                      className="flex-1 rounded-[4px] bg-[#009245] text-white font-bold h-11"
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => approveProcess(selectedEvent.id, 'rejected', selectedEvent)}
                      className="flex-1 rounded-[4px] border-red-200 text-red-600 hover:bg-red-50 font-bold h-11"
                    >
                      Reject
                    </Button>
                  </>
                )}
                <Button
                  onClick={() => setSelectedEvent(null)}
                  className="w-full rounded-[4px] border border-[#E0E0E0] bg-white text-[#333333] hover:bg-[#F2F2F2] font-bold text-xs h-11 transition-colors"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="bg-[#E6F4EA] border border-[#009245]/20 rounded-[4px] p-4 md:p-6 flex items-start gap-4">
        <Info className="h-5 w-5 text-[#009245] mt-0.5 hidden sm:block" />
        <div className="space-y-1">
          <p className="text-[10px] md:text-xs font-bold text-[#009245] uppercase tracking-wide">Intelligent Ledger</p>
          <p className="text-[10px] md:text-xs font-medium text-[#009245]/80 leading-relaxed">
            The portal detects schedule conflicts. "OVERLAP" badges appear automatically. Click on a request row to review full logistics or perform administrative actions.
          </p>
        </div>
      </div>
    </div>
  )
}
