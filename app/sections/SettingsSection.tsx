'use client'

import React, { useState, useEffect } from 'react'
import { FiPlus, FiTrash2, FiEdit2, FiX, FiCheck, FiUser } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getSchedule, getScheduleLogs, pauseSchedule, resumeSchedule, cronToHuman, type Schedule, type ExecutionLog } from '@/lib/scheduler'

interface Developer {
  name: string
  email: string
  skillTags: string[]
  maxCapacity: number
  activeTickets: number
}

interface DeadlineRule {
  priority: string
  days: number
}

interface SettingsProps {
  developers: Developer[]
  deadlineRules: DeadlineRule[]
  onAddDeveloper: (dev: Developer) => void
  onRemoveDeveloper: (email: string) => void
  onUpdateDeveloper: (email: string, dev: Developer) => void
  onUpdateDeadlineRules: (rules: DeadlineRule[]) => void
}

const ALL_TAGS = ['backend', 'frontend', 'devops', 'auth', 'database', 'mobile', 'testing', 'security', 'api', 'infrastructure']
const SCHEDULE_ID = '69a3d98f25d4d77f732f82c8'

export default function SettingsSection({ developers, deadlineRules, onAddDeveloper, onRemoveDeveloper, onUpdateDeveloper, onUpdateDeadlineRules }: SettingsProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [capacity, setCapacity] = useState('5')
  const [editingEmail, setEditingEmail] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Developer | null>(null)
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [logs, setLogs] = useState<ExecutionLog[]>([])
  const [schedLoading, setSchedLoading] = useState(false)

  useEffect(() => {
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

  const handleAddDev = () => {
    if (!name.trim() || !email.trim()) return
    onAddDeveloper({ name: name.trim(), email: email.trim(), skillTags: tags, maxCapacity: parseInt(capacity) || 5, activeTickets: 0 })
    setName('')
    setEmail('')
    setTags([])
    setCapacity('5')
  }

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const toggleEditTag = (tag: string) => {
    if (!editForm) return
    setEditForm(prev => prev ? { ...prev, skillTags: prev.skillTags.includes(tag) ? prev.skillTags.filter(t => t !== tag) : [...prev.skillTags, tag] } : null)
  }

  const startEdit = (dev: Developer) => {
    setEditingEmail(dev.email)
    setEditForm({ ...dev })
  }

  const saveEdit = () => {
    if (editingEmail && editForm) {
      onUpdateDeveloper(editingEmail, editForm)
      setEditingEmail(null)
      setEditForm(null)
    }
  }

  const cancelEdit = () => {
    setEditingEmail(null)
    setEditForm(null)
  }

  const updateRule = (priority: string, days: number) => {
    onUpdateDeadlineRules(deadlineRules.map(r => r.priority === priority ? { ...r, days } : r))
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Add Developer */}
      <div className="rounded-md border p-5" style={{ background: 'hsl(220 16% 16%)', borderColor: 'hsl(220 16% 22%)' }}>
        <h2 className="text-sm font-sans font-semibold mb-4" style={{ color: 'hsl(219 28% 88%)' }}>Add Developer</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-sans font-medium mb-1 block" style={{ color: 'hsl(219 14% 65%)' }}>Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" className="h-9 text-sm font-sans border" style={{ background: 'hsl(220 16% 28%)', color: 'hsl(219 28% 88%)', borderColor: 'hsl(220 16% 22%)' }} />
          </div>
          <div>
            <Label className="text-xs font-sans font-medium mb-1 block" style={{ color: 'hsl(219 14% 65%)' }}>Email *</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="john@company.com" className="h-9 text-sm font-sans border" style={{ background: 'hsl(220 16% 28%)', color: 'hsl(219 28% 88%)', borderColor: 'hsl(220 16% 22%)' }} />
          </div>
        </div>
        <div className="mt-3">
          <Label className="text-xs font-sans font-medium mb-1 block" style={{ color: 'hsl(219 14% 65%)' }}>Skill Tags</Label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_TAGS.map(tag => (
              <button key={tag} onClick={() => toggleTag(tag)} className="px-2 py-1 rounded text-xs font-sans transition-all" style={{ background: tags.includes(tag) ? 'hsl(213 32% 52%)' : 'hsl(220 16% 26%)', color: tags.includes(tag) ? 'white' : 'hsl(219 14% 65%)' }}>
                {tag}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-end gap-3">
          <div className="flex-1">
            <Label className="text-xs font-sans font-medium mb-1 block" style={{ color: 'hsl(219 14% 65%)' }}>Max Capacity</Label>
            <Input value={capacity} onChange={e => setCapacity(e.target.value)} type="number" min="1" max="20" className="h-9 text-sm font-sans border w-24" style={{ background: 'hsl(220 16% 28%)', color: 'hsl(219 28% 88%)', borderColor: 'hsl(220 16% 22%)' }} />
          </div>
          <Button onClick={handleAddDev} disabled={!name.trim() || !email.trim()} className="h-9 px-4 text-xs font-sans font-medium" style={{ background: 'hsl(213 32% 52%)', color: 'white' }}>
            <FiPlus className="w-3 h-3 mr-1" /> Add Developer
          </Button>
        </div>
      </div>

      {/* Developer Cards */}
      <div className="rounded-md border" style={{ background: 'hsl(220 16% 16%)', borderColor: 'hsl(220 16% 22%)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'hsl(220 16% 22%)' }}>
          <h2 className="text-sm font-sans font-semibold" style={{ color: 'hsl(219 28% 88%)' }}>Developer Profiles ({developers.length})</h2>
        </div>
        {developers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-sans" style={{ color: 'hsl(219 14% 65%)' }}>No developers configured. Add your first developer profile.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="p-4 space-y-2">
              {developers.map(dev => (
                <div key={dev.email} className="rounded-md border p-3" style={{ borderColor: 'hsl(220 16% 22%)', background: 'hsl(220 16% 13%)' }}>
                  {editingEmail === dev.email && editForm ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={editForm.name} onChange={e => setEditForm(prev => prev ? { ...prev, name: e.target.value } : null)} className="h-8 text-xs border" style={{ background: 'hsl(220 16% 28%)', color: 'hsl(219 28% 88%)', borderColor: 'hsl(220 16% 22%)' }} />
                        <Input value={editForm.email} onChange={e => setEditForm(prev => prev ? { ...prev, email: e.target.value } : null)} className="h-8 text-xs border" style={{ background: 'hsl(220 16% 28%)', color: 'hsl(219 28% 88%)', borderColor: 'hsl(220 16% 22%)' }} />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {ALL_TAGS.map(tag => (
                          <button key={tag} onClick={() => toggleEditTag(tag)} className="px-1.5 py-0.5 rounded text-xs font-sans" style={{ background: editForm.skillTags.includes(tag) ? 'hsl(213 32% 52%)' : 'hsl(220 16% 26%)', color: editForm.skillTags.includes(tag) ? 'white' : 'hsl(219 14% 65%)' }}>
                            {tag}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input value={String(editForm.maxCapacity)} onChange={e => setEditForm(prev => prev ? { ...prev, maxCapacity: parseInt(e.target.value) || 5 } : null)} type="number" className="h-8 text-xs border w-20" style={{ background: 'hsl(220 16% 28%)', color: 'hsl(219 28% 88%)', borderColor: 'hsl(220 16% 22%)' }} />
                        <span className="text-xs" style={{ color: 'hsl(219 14% 65%)' }}>max tickets</span>
                        <div className="ml-auto flex gap-1">
                          <Button onClick={saveEdit} className="h-7 w-7 p-0" style={{ background: 'hsl(92 28% 60%)', color: 'white' }}><FiCheck className="w-3 h-3" /></Button>
                          <Button onClick={cancelEdit} className="h-7 w-7 p-0" style={{ background: 'hsl(354 42% 45%)', color: 'white' }}><FiX className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'hsl(220 16% 26%)' }}>
                        <FiUser className="w-4 h-4" style={{ color: 'hsl(213 32% 60%)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-sans font-medium" style={{ color: 'hsl(219 28% 88%)' }}>{dev.name}</p>
                        <p className="text-xs font-sans" style={{ color: 'hsl(219 14% 65%)' }}>{dev.email} | Cap: {dev.maxCapacity}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Array.isArray(dev.skillTags) && dev.skillTags.map((tag, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'hsl(220 16% 26%)', color: 'hsl(193 43% 65%)' }}>{tag}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(dev)} className="p-1.5 rounded hover:opacity-80 transition-opacity" style={{ color: 'hsl(213 32% 60%)' }}><FiEdit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => onRemoveDeveloper(dev.email)} className="p-1.5 rounded hover:opacity-80 transition-opacity" style={{ color: 'hsl(354 42% 45%)' }}><FiTrash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Priority-to-Deadline Rules */}
      <div className="rounded-md border p-5" style={{ background: 'hsl(220 16% 16%)', borderColor: 'hsl(220 16% 22%)' }}>
        <h2 className="text-sm font-sans font-semibold mb-3" style={{ color: 'hsl(219 28% 88%)' }}>Priority-to-Deadline Rules</h2>
        <div className="space-y-2">
          {deadlineRules.map(rule => (
            <div key={rule.priority} className="flex items-center gap-3 text-sm font-sans">
              <span className="w-20 capitalize font-medium" style={{ color: 'hsl(219 28% 88%)' }}>{rule.priority}</span>
              <Input value={String(rule.days)} onChange={e => updateRule(rule.priority, parseInt(e.target.value) || 1)} type="number" min="1" className="h-8 w-20 text-xs border text-center" style={{ background: 'hsl(220 16% 28%)', color: 'hsl(219 28% 88%)', borderColor: 'hsl(220 16% 22%)' }} />
              <span className="text-xs" style={{ color: 'hsl(219 14% 65%)' }}>days</span>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Management */}
      <div className="rounded-md border p-5" style={{ background: 'hsl(220 16% 16%)', borderColor: 'hsl(220 16% 22%)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-sans font-semibold" style={{ color: 'hsl(219 28% 88%)' }}>Schedule Management</h2>
            <p className="text-xs font-sans mt-1" style={{ color: 'hsl(219 14% 65%)' }}>
              Daily Check-In Agent | {schedule?.cron_expression ? cronToHuman(schedule.cron_expression) : 'Daily at 9:00 AM'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-xs font-sans" style={{ color: 'hsl(219 14% 65%)' }}>
              {schedule?.is_active ? 'Active' : 'Paused'}
            </Label>
            <Switch checked={schedule?.is_active ?? false} onCheckedChange={handleToggleSchedule} disabled={schedLoading} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs font-sans">
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
          <div className="rounded-md p-3 border" style={{ background: 'hsl(220 16% 13%)', borderColor: 'hsl(220 16% 22%)' }}>
            <span style={{ color: 'hsl(219 14% 65%)' }}>Last Run</span>
            <p className="font-medium mt-1" style={{ color: 'hsl(219 28% 88%)' }}>
              {schedule?.last_run_at ? new Date(schedule.last_run_at).toLocaleString() : 'Never'}
            </p>
          </div>
        </div>

        {logs.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-sans font-medium mb-2" style={{ color: 'hsl(219 14% 65%)' }}>Run History</p>
            <div className="space-y-1">
              {logs.map((log, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-sans px-2 py-1.5 rounded" style={{ background: 'hsl(220 16% 13%)' }}>
                  <FiCheck className="w-3 h-3" style={{ color: log.success ? 'hsl(92 28% 60%)' : 'hsl(354 42% 45%)' }} />
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
