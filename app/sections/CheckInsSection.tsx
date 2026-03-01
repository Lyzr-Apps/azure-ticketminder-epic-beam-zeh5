'use client'

import React, { useState, useEffect } from 'react'
import { FiSend, FiLoader, FiCalendar, FiAlertTriangle, FiCheckCircle, FiClock, FiPlay, FiPause } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { getSchedule, getScheduleLogs, pauseSchedule, resumeSchedule, cronToHuman, type Schedule, type ExecutionLog } from '@/lib/scheduler'

interface Developer {
  name: string
  email: string
  skillTags: string[]
  maxCapacity: number
  activeTickets: number
}

interface CheckIn {
  developerName: string
  date: string
  ticketUpdates: { ticketId: string; title: string; status: string; percentComplete: number; notes: string }[]
  blockers: { description: string; severity: string; relatedTicket: string }[]
  accomplishments: string[]
  overallHealth: string
  parsedSummary: string
}

interface CheckInsProps {
  developers: Developer[]
  checkIns: CheckIn[]
  loading: boolean
  statusMessage: string
  onSubmitCheckIn: (devName: string, summary: string) => void
}

const SCHEDULE_ID = '69a3d98f25d4d77f732f82c8'

const HEALTH_COLORS: Record<string, string> = {
  healthy: 'hsl(92 28% 60%)',
  good: 'hsl(92 28% 60%)',
  'at-risk': 'hsl(14 51% 60%)',
  warning: 'hsl(14 51% 60%)',
  critical: 'hsl(354 42% 45%)',
  blocked: 'hsl(354 42% 45%)',
}

export default function CheckInsSection({ developers, checkIns, loading, statusMessage, onSubmitCheckIn }: CheckInsProps) {
  const [selectedDev, setSelectedDev] = useState('')
  const [summary, setSummary] = useState('')
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [logs, setLogs] = useState<ExecutionLog[]>([])
  const [schedLoading, setSchedLoading] = useState(false)
  const [todayStr, setTodayStr] = useState('')

  useEffect(() => {
    setTodayStr(new Date().toISOString().split('T')[0])
    loadSchedule()
  }, [])

  const loadSchedule = async () => {
    try {
      const s = await getSchedule(SCHEDULE_ID)
      if (s.success && s.schedule) setSchedule(s.schedule)
      const l = await getScheduleLogs(SCHEDULE_ID, { limit: 5 })
      if (l.success && Array.isArray(l.executions)) setLogs(l.executions)
    } catch { /* ignore */ }
  }

  const handleToggleSchedule = async () => {
    if (!schedule) return
    setSchedLoading(true)
    try {
      if (schedule.is_active) {
        const res = await pauseSchedule(SCHEDULE_ID)
        if (res.success) setSchedule(prev => prev ? { ...prev, is_active: false } : null)
      } else {
        const res = await resumeSchedule(SCHEDULE_ID)
        if (res.success) setSchedule(prev => prev ? { ...prev, is_active: true } : null)
      }
      await loadSchedule()
    } catch { /* ignore */ }
    setSchedLoading(false)
  }

  const handleSubmit = () => {
    if (!selectedDev || !summary.trim()) return
    onSubmitCheckIn(selectedDev, summary)
    setSummary('')
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Check-in Form */}
        <div className="rounded-md border p-5 space-y-4" style={{ background: 'hsl(220 16% 16%)', borderColor: 'hsl(220 16% 22%)' }}>
          <h2 className="text-sm font-sans font-semibold" style={{ color: 'hsl(219 28% 88%)' }}>Submit Daily Check-In</h2>

          {statusMessage && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-sans" style={{ background: 'hsla(213, 32%, 52%, 0.15)', color: 'hsl(213 32% 60%)', border: '1px solid hsla(213, 32%, 52%, 0.3)' }}>
              <FiCheckCircle className="w-3 h-3" /> {statusMessage}
            </div>
          )}

          <div>
            <Label className="text-xs font-sans font-medium mb-1 block" style={{ color: 'hsl(219 14% 65%)' }}>Developer</Label>
            <select value={selectedDev} onChange={e => setSelectedDev(e.target.value)} className="w-full h-9 px-3 rounded-md text-sm font-sans border" style={{ background: 'hsl(220 16% 28%)', color: 'hsl(219 28% 88%)', borderColor: 'hsl(220 16% 22%)' }}>
              <option value="">Select developer...</option>
              {developers.map(d => (
                <option key={d.email} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs font-sans font-medium mb-1 block" style={{ color: 'hsl(219 14% 65%)' }}>Date</Label>
            <div className="flex items-center gap-2 h-9 px-3 rounded-md text-sm font-sans border" style={{ background: 'hsl(220 16% 28%)', color: 'hsl(219 28% 88%)', borderColor: 'hsl(220 16% 22%)' }}>
              <FiCalendar className="w-3 h-3" style={{ color: 'hsl(219 14% 65%)' }} />
              {todayStr || 'Loading...'}
            </div>
          </div>

          <div>
            <Label className="text-xs font-sans font-medium mb-1 block" style={{ color: 'hsl(219 14% 65%)' }}>What did you work on? Any blockers?</Label>
            <Textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Worked on ADO-1234 auth bug fix, about 60% done. Blocked on ADO-1236 waiting for API specs..." rows={5} className="text-sm font-sans border resize-none" style={{ background: 'hsl(220 16% 28%)', color: 'hsl(219 28% 88%)', borderColor: 'hsl(220 16% 22%)' }} />
          </div>

          <Button onClick={handleSubmit} disabled={loading || !selectedDev || !summary.trim()} className="w-full h-9 text-sm font-sans font-medium" style={{ background: 'hsl(213 32% 52%)', color: 'white' }}>
            {loading ? <><FiLoader className="w-3 h-3 mr-2 animate-spin" /> Parsing Check-In...</> : <><FiSend className="w-3 h-3 mr-2" /> Submit Check-In</>}
          </Button>

          {developers.length === 0 && (
            <p className="text-xs font-sans text-center" style={{ color: 'hsl(219 14% 65%)' }}>Add developers in Settings first.</p>
          )}
        </div>

        {/* Right: History Timeline */}
        <div className="rounded-md border" style={{ background: 'hsl(220 16% 16%)', borderColor: 'hsl(220 16% 22%)' }}>
          <div className="p-4 border-b" style={{ borderColor: 'hsl(220 16% 22%)' }}>
            <h2 className="text-sm font-sans font-semibold" style={{ color: 'hsl(219 28% 88%)' }}>Check-In History</h2>
          </div>
          {checkIns.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-sans" style={{ color: 'hsl(219 14% 65%)' }}>No check-ins recorded. Submit your first daily update.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="p-4 space-y-3">
                {checkIns.map((ci, idx) => {
                  const healthColor = HEALTH_COLORS[ci.overallHealth?.toLowerCase()] ?? 'hsl(219 14% 65%)'
                  return (
                    <div key={idx} className="rounded-md border p-3 space-y-2" style={{ borderColor: 'hsl(220 16% 22%)', background: 'hsl(220 16% 13%)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-sans font-semibold" style={{ color: 'hsl(219 28% 88%)' }}>{ci.developerName ?? 'Unknown'}</span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${healthColor}22`, color: healthColor }}>{ci.overallHealth ?? '-'}</span>
                          <span className="text-xs font-mono" style={{ color: 'hsl(219 14% 65%)' }}>{ci.date ?? ''}</span>
                        </div>
                      </div>

                      {ci.parsedSummary && <p className="text-xs font-sans" style={{ color: 'hsl(219 14% 65%)' }}>{ci.parsedSummary}</p>}

                      {Array.isArray(ci.ticketUpdates) && ci.ticketUpdates.length > 0 && (
                        <div className="space-y-1">
                          {ci.ticketUpdates.map((tu, j) => (
                            <div key={j} className="flex items-center gap-2 text-xs font-sans">
                              <span className="font-mono" style={{ color: 'hsl(213 32% 60%)' }}>{tu.ticketId}</span>
                              <span style={{ color: 'hsl(219 28% 88%)' }}>{tu.title}</span>
                              <span className="ml-auto px-1.5 py-0.5 rounded text-xs" style={{ background: 'hsl(220 16% 26%)', color: 'hsl(193 43% 65%)' }}>{tu.status}</span>
                              <span style={{ color: 'hsl(219 14% 65%)' }}>{tu.percentComplete ?? 0}%</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {Array.isArray(ci.blockers) && ci.blockers.length > 0 && (
                        <div className="space-y-1">
                          {ci.blockers.map((b, j) => (
                            <div key={j} className="flex items-center gap-2 text-xs font-sans px-2 py-1 rounded" style={{ background: 'hsla(354, 42%, 45%, 0.1)' }}>
                              <FiAlertTriangle className="w-3 h-3" style={{ color: 'hsl(354 42% 45%)' }} />
                              <span style={{ color: 'hsl(354 42% 45%)' }}>{b.description}</span>
                              {b.relatedTicket && <span className="font-mono ml-auto" style={{ color: 'hsl(219 14% 65%)' }}>{b.relatedTicket}</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      {Array.isArray(ci.accomplishments) && ci.accomplishments.length > 0 && (
                        <div className="space-y-0.5">
                          {ci.accomplishments.map((a, j) => (
                            <div key={j} className="flex items-start gap-2 text-xs font-sans">
                              <FiCheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: 'hsl(92 28% 60%)' }} />
                              <span style={{ color: 'hsl(219 28% 88%)' }}>{a}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Schedule Management Panel */}
      <div className="mt-5 rounded-md border p-5" style={{ background: 'hsl(220 16% 16%)', borderColor: 'hsl(220 16% 22%)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-sans font-semibold" style={{ color: 'hsl(219 28% 88%)' }}>Daily Check-In Schedule</h2>
            <p className="text-xs font-sans mt-1" style={{ color: 'hsl(219 14% 65%)' }}>
              {schedule?.cron_expression ? cronToHuman(schedule.cron_expression) : 'Daily at 9:00 AM'} ({schedule?.timezone ?? 'America/New_York'})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-xs font-sans" style={{ color: 'hsl(219 14% 65%)' }}>
              {schedule?.is_active ? 'Active' : 'Paused'}
            </Label>
            <Switch checked={schedule?.is_active ?? false} onCheckedChange={handleToggleSchedule} disabled={schedLoading} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs font-sans">
          <div className="rounded-md p-3 border" style={{ background: 'hsl(220 16% 13%)', borderColor: 'hsl(220 16% 22%)' }}>
            <span style={{ color: 'hsl(219 14% 65%)' }}>Status</span>
            <p className="font-medium mt-1" style={{ color: schedule?.is_active ? 'hsl(92 28% 60%)' : 'hsl(14 51% 60%)' }}>
              {schedule?.is_active ? 'Active' : 'Paused'}
            </p>
          </div>
          <div className="rounded-md p-3 border" style={{ background: 'hsl(220 16% 13%)', borderColor: 'hsl(220 16% 22%)' }}>
            <span style={{ color: 'hsl(219 14% 65%)' }}>Next Run</span>
            <p className="font-medium mt-1" style={{ color: 'hsl(219 28% 88%)' }}>
              {schedule?.next_run_time ? new Date(schedule.next_run_time).toLocaleString() : 'N/A'}
            </p>
          </div>
        </div>

        {logs.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-sans font-medium mb-2" style={{ color: 'hsl(219 14% 65%)' }}>Recent Runs</p>
            <div className="space-y-1">
              {logs.map((log, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-sans px-2 py-1.5 rounded" style={{ background: 'hsl(220 16% 13%)' }}>
                  {log.success ? <FiCheckCircle className="w-3 h-3" style={{ color: 'hsl(92 28% 60%)' }} /> : <FiAlertTriangle className="w-3 h-3" style={{ color: 'hsl(354 42% 45%)' }} />}
                  <span style={{ color: 'hsl(219 28% 88%)' }}>{new Date(log.executed_at).toLocaleString()}</span>
                  <span className="ml-auto" style={{ color: log.success ? 'hsl(92 28% 60%)' : 'hsl(354 42% 45%)' }}>{log.success ? 'Success' : 'Failed'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
