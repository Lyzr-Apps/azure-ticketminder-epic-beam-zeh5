'use client'

import React, { useState } from 'react'
import { FiAlertTriangle, FiClock, FiCheckCircle, FiLoader, FiArrowUp, FiArrowDown, FiActivity, FiPlus, FiTrash2, FiX } from 'react-icons/fi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Developer {
  name: string
  email: string
  skillTags: string[]
  maxCapacity: number
  activeTickets: number
}

interface Ticket {
  ticketId: string
  title: string
  tags: string[]
  priority: string
  complexity: string
  description: string
  status: string
  assignedTo?: string
  assignedEmail?: string
  deadline?: string
  reasoning?: string
  matchedTags?: string[]
}

interface Assignment {
  ticketId: string
  title: string
  assignedTo: string
  assignedEmail: string
  matchedTags: string[]
  deadline: string
  priority: string
  reasoning: string
}

interface DashboardProps {
  developers: Developer[]
  tickets: Ticket[]
  assignments: Assignment[]
  loading: boolean
  statusMessage: string
  onProcessTickets: () => void
  onAddTicket: (ticket: Ticket) => void
  onRemoveTicket: (ticketId: string) => void
  sampleMode: boolean
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'hsl(354 42% 45%)',
  high: 'hsl(14 51% 60%)',
  medium: 'hsl(40 60% 55%)',
  low: 'hsl(92 28% 60%)',
}

const STATUS_COLORS: Record<string, string> = {
  unassigned: 'hsl(219 14% 65%)',
  assigned: 'hsl(213 32% 60%)',
  'in-progress': 'hsl(193 43% 65%)',
  blocked: 'hsl(354 42% 45%)',
  completed: 'hsl(92 28% 60%)',
}

const ALL_TAGS = ['backend', 'frontend', 'devops', 'auth', 'database', 'mobile', 'testing', 'security', 'api', 'infrastructure']
const PRIORITIES = ['critical', 'high', 'medium', 'low']

export default function DashboardSection({ developers, tickets, assignments, loading, statusMessage, onProcessTickets, onAddTicket, onRemoveTicket, sampleMode }: DashboardProps) {
  const [sortField, setSortField] = useState<string>('status')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTicket, setNewTicket] = useState({ ticketId: '', title: '', tags: [] as string[], priority: 'medium', complexity: 'medium', description: '' })

  const unassigned = tickets.filter(t => t.status === 'unassigned').length
  const inProgress = tickets.filter(t => t.status === 'in-progress').length
  const blocked = tickets.filter(t => t.status === 'blocked').length
  const completed = tickets.filter(t => t.status === 'completed').length

  const hasBlockedOrOverdue = blocked > 0

  const allDisplayTickets = tickets.map(t => {
    const a = assignments.find(a2 => a2.ticketId === t.ticketId)
    return { ...t, assignedTo: a?.assignedTo ?? t.assignedTo ?? '', deadline: a?.deadline ?? t.deadline ?? '', matchedTags: a?.matchedTags ?? t.matchedTags ?? t.tags }
  })

  const sortedTickets = [...allDisplayTickets].sort((a, b) => {
    const aVal = (a as Record<string, any>)[sortField] ?? ''
    const bVal = (b as Record<string, any>)[sortField] ?? ''
    const cmp = String(aVal).localeCompare(String(bVal))
    return sortDir === 'asc' ? cmp : -cmp
  })

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null
    return sortDir === 'asc' ? <FiArrowUp className="w-3 h-3 inline ml-1" /> : <FiArrowDown className="w-3 h-3 inline ml-1" />
  }

  const stats = [
    { label: 'Unassigned', value: unassigned, color: 'hsl(219 14% 65%)', icon: FiClock },
    { label: 'In Progress', value: inProgress, color: 'hsl(193 43% 65%)', icon: FiActivity },
    { label: 'Blocked', value: blocked, color: 'hsl(354 42% 45%)', icon: FiAlertTriangle },
    { label: 'Completed', value: completed, color: 'hsl(92 28% 60%)', icon: FiCheckCircle },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {developers.length === 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-md text-sm font-sans" style={{ background: 'hsla(14, 51%, 60%, 0.15)', color: 'hsl(14 51% 60%)', border: '1px solid hsla(14, 51%, 60%, 0.3)' }}>
          <FiAlertTriangle className="w-4 h-4 flex-shrink-0" />
          No developers configured. Visit Settings first to add developer profiles.
        </div>
      )}

      {hasBlockedOrOverdue && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-md text-sm font-sans" style={{ background: 'hsla(354, 42%, 45%, 0.15)', color: 'hsl(354 42% 45%)', border: '1px solid hsla(354, 42%, 45%, 0.3)' }}>
          <FiAlertTriangle className="w-4 h-4 flex-shrink-0" />
          {blocked} ticket(s) are currently blocked. Review check-ins for details.
        </div>
      )}

      {statusMessage && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-md text-sm font-sans" style={{ background: 'hsla(213, 32%, 52%, 0.15)', color: 'hsl(213 32% 60%)', border: '1px solid hsla(213, 32%, 52%, 0.3)' }}>
          <FiCheckCircle className="w-4 h-4 flex-shrink-0" />
          {statusMessage}
        </div>
      )}

      {/* Add Ticket */}
      {!sampleMode && (
        <div className="rounded-md border" style={{ background: 'hsl(220 16% 16%)', borderColor: 'hsl(220 16% 22%)' }}>
          <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: 'hsl(220 16% 22%)' }}>
            <h3 className="text-xs font-sans font-semibold" style={{ color: 'hsl(219 28% 88%)' }}>Add Ticket</h3>
            <button onClick={() => setShowAddForm(!showAddForm)} className="p-1 rounded" style={{ color: 'hsl(213 32% 60%)' }}>
              {showAddForm ? <FiX className="w-3.5 h-3.5" /> : <FiPlus className="w-3.5 h-3.5" />}
            </button>
          </div>
          {showAddForm && (
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input value={newTicket.ticketId} onChange={e => setNewTicket(prev => ({ ...prev, ticketId: e.target.value }))} placeholder="ADO-1234" className="h-8 px-2 rounded-md text-xs font-mono border" style={{ background: 'hsl(220 16% 28%)', color: 'hsl(219 28% 88%)', borderColor: 'hsl(220 16% 22%)' }} />
                <input value={newTicket.title} onChange={e => setNewTicket(prev => ({ ...prev, title: e.target.value }))} placeholder="Ticket title" className="h-8 px-2 rounded-md text-xs font-sans border" style={{ background: 'hsl(220 16% 28%)', color: 'hsl(219 28% 88%)', borderColor: 'hsl(220 16% 22%)' }} />
              </div>
              <input value={newTicket.description} onChange={e => setNewTicket(prev => ({ ...prev, description: e.target.value }))} placeholder="Description" className="w-full h-8 px-2 rounded-md text-xs font-sans border" style={{ background: 'hsl(220 16% 28%)', color: 'hsl(219 28% 88%)', borderColor: 'hsl(220 16% 22%)' }} />
              <div className="flex gap-2">
                <select value={newTicket.priority} onChange={e => setNewTicket(prev => ({ ...prev, priority: e.target.value }))} className="h-8 px-2 rounded-md text-xs font-sans border" style={{ background: 'hsl(220 16% 28%)', color: 'hsl(219 28% 88%)', borderColor: 'hsl(220 16% 22%)' }}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={newTicket.complexity} onChange={e => setNewTicket(prev => ({ ...prev, complexity: e.target.value }))} className="h-8 px-2 rounded-md text-xs font-sans border" style={{ background: 'hsl(220 16% 28%)', color: 'hsl(219 28% 88%)', borderColor: 'hsl(220 16% 22%)' }}>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </div>
              <div>
                <span className="text-xs font-sans mb-1 block" style={{ color: 'hsl(219 14% 65%)' }}>Tags</span>
                <div className="flex flex-wrap gap-1">
                  {ALL_TAGS.map(tag => (
                    <button key={tag} onClick={() => setNewTicket(prev => ({ ...prev, tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag] }))} className="px-1.5 py-0.5 rounded text-xs font-sans transition-all" style={{ background: newTicket.tags.includes(tag) ? 'hsl(213 32% 52%)' : 'hsl(220 16% 26%)', color: newTicket.tags.includes(tag) ? 'white' : 'hsl(219 14% 65%)' }}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={() => { if (newTicket.ticketId && newTicket.title) { onAddTicket({ ...newTicket, status: 'unassigned' }); setNewTicket({ ticketId: '', title: '', tags: [], priority: 'medium', complexity: 'medium', description: '' }); setShowAddForm(false) } }} disabled={!newTicket.ticketId || !newTicket.title} className="h-7 px-3 text-xs font-sans" style={{ background: 'hsl(213 32% 52%)', color: 'white' }}>
                <FiPlus className="w-3 h-3 mr-1" /> Add Ticket
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="rounded-md p-4 border" style={{ background: 'hsl(220 16% 16%)', borderColor: 'hsl(220 16% 22%)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-sans font-medium" style={{ color: 'hsl(219 14% 65%)' }}>{s.label}</span>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <p className="text-2xl font-sans font-semibold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-md border" style={{ background: 'hsl(220 16% 16%)', borderColor: 'hsl(220 16% 22%)' }}>
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'hsl(220 16% 22%)' }}>
            <h2 className="text-sm font-sans font-semibold" style={{ color: 'hsl(219 28% 88%)' }}>Assignment Log</h2>
            <Button onClick={onProcessTickets} disabled={loading || developers.length === 0 || unassigned === 0} className="h-8 px-3 text-xs font-sans font-medium" style={{ background: 'hsl(213 32% 52%)', color: 'white' }}>
              {loading ? <><FiLoader className="w-3 h-3 mr-1 animate-spin" /> Processing...</> : 'Process New Tickets'}
            </Button>
          </div>

          {sortedTickets.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-sans" style={{ color: 'hsl(219 14% 65%)' }}>No tickets processed yet. Click &quot;Process New Tickets&quot; to get started.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <table className="w-full text-xs font-sans">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(220 16% 22%)' }}>
                    {[
                      { key: 'ticketId', label: 'Ticket ID' },
                      { key: 'title', label: 'Title' },
                      { key: 'tags', label: 'Tags' },
                      { key: 'assignedTo', label: 'Assignee' },
                      { key: 'deadline', label: 'Deadline' },
                      { key: 'status', label: 'Status' },
                    ].map(col => (
                      <th key={col.key} className="px-3 py-2 text-left cursor-pointer select-none font-medium" style={{ color: 'hsl(219 14% 65%)' }} onClick={() => handleSort(col.key)}>
                        {col.label}<SortIcon field={col.key} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedTickets.map(t => (
                    <tr key={t.ticketId} className="transition-colors" style={{ borderBottom: '1px solid hsl(220 16% 22%)' }}>
                      <td className="px-3 py-2 font-mono" style={{ color: 'hsl(213 32% 60%)' }}>{t.ticketId}</td>
                      <td className="px-3 py-2" style={{ color: 'hsl(219 28% 88%)' }}>{t.title}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(t.matchedTags) && t.matchedTags.map((tag, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'hsl(220 16% 26%)', color: 'hsl(193 43% 65%)' }}>{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2" style={{ color: 'hsl(219 28% 88%)' }}>{t.assignedTo || '-'}</td>
                      <td className="px-3 py-2" style={{ color: 'hsl(219 14% 65%)' }}>{t.deadline || '-'}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${STATUS_COLORS[t.status] ?? 'hsl(219 14% 65%)'}22`, color: STATUS_COLORS[t.status] ?? 'hsl(219 14% 65%)' }}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          )}
        </div>

        <div className="rounded-md border" style={{ background: 'hsl(220 16% 16%)', borderColor: 'hsl(220 16% 22%)' }}>
          <div className="p-4 border-b" style={{ borderColor: 'hsl(220 16% 22%)' }}>
            <h2 className="text-sm font-sans font-semibold" style={{ color: 'hsl(219 28% 88%)' }}>Developer Workload</h2>
          </div>
          {developers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-sans" style={{ color: 'hsl(219 14% 65%)' }}>No developers configured yet.</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {developers.map(dev => {
                const active = tickets.filter(t => t.assignedTo === dev.name && t.status !== 'completed').length + (dev.activeTickets || 0)
                const pct = dev.maxCapacity > 0 ? Math.min((active / dev.maxCapacity) * 100, 100) : 0
                const barColor = pct > 80 ? 'hsl(354 42% 45%)' : pct > 50 ? 'hsl(14 51% 60%)' : 'hsl(92 28% 60%)'
                return (
                  <div key={dev.email}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-sans font-medium" style={{ color: 'hsl(219 28% 88%)' }}>{dev.name}</span>
                      <span className="text-xs font-mono" style={{ color: 'hsl(219 14% 65%)' }}>{active}/{dev.maxCapacity}</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ background: 'hsl(220 16% 26%)' }}>
                      <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Array.isArray(dev.skillTags) && dev.skillTags.map((tag, i) => (
                        <span key={i} className="text-xs px-1 py-0.5 rounded" style={{ background: 'hsl(220 16% 26%)', color: 'hsl(219 14% 65%)' }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
