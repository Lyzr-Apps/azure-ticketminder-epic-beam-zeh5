'use client'

import React, { useState, useEffect } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import parseLLMJson from '@/lib/jsonParser'
import { FiGrid, FiCheckCircle, FiSettings, FiTerminal, FiAlertTriangle, FiClock, FiLoader, FiArrowUp, FiArrowDown, FiActivity, FiPlus, FiX, FiSend, FiCalendar, FiUser, FiTrash2, FiEdit2, FiCheck } from 'react-icons/fi'
import { getSchedule, getScheduleLogs, pauseSchedule, resumeSchedule, cronToHuman } from '@/lib/scheduler'
import type { Schedule, ExecutionLog } from '@/lib/scheduler'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Developer { name: string; email: string; skillTags: string[]; maxCapacity: number; activeTickets: number }
interface Ticket { ticketId: string; title: string; tags: string[]; priority: string; complexity: string; description: string; status: string; assignedTo?: string; assignedEmail?: string; deadline?: string; reasoning?: string; matchedTags?: string[] }
interface Assignment { ticketId: string; title: string; assignedTo: string; assignedEmail: string; matchedTags: string[]; deadline: string; priority: string; reasoning: string }
interface CheckIn { developerName: string; date: string; ticketUpdates: { ticketId: string; title: string; status: string; percentComplete: number; notes: string }[]; blockers: { description: string; severity: string; relatedTicket: string }[]; accomplishments: string[]; overallHealth: string; parsedSummary: string }
interface DeadlineRule { priority: string; days: number }

// ─── Constants ───────────────────────────────────────────────────────────────
const TICKET_AGENT_ID = '69a3d988f20444e7993a6f2b'
const CHECKIN_AGENT_ID = '69a3d988778070004ef82c98'
const SCHEDULE_ID = '69a3d98f25d4d77f732f82c8'
const ALL_TAGS = ['backend', 'frontend', 'devops', 'auth', 'database', 'mobile', 'testing', 'security', 'api', 'infrastructure']
const PRIORITIES = ['critical', 'high', 'medium', 'low']
const PRIORITY_COLORS: Record<string, string> = { critical: 'hsl(354 42% 45%)', high: 'hsl(14 51% 60%)', medium: 'hsl(40 60% 55%)', low: 'hsl(92 28% 60%)' }
const STATUS_COLORS: Record<string, string> = { unassigned: 'hsl(219 14% 65%)', assigned: 'hsl(213 32% 60%)', 'in-progress': 'hsl(193 43% 65%)', blocked: 'hsl(354 42% 45%)', completed: 'hsl(92 28% 60%)' }
const HEALTH_COLORS: Record<string, string> = { healthy: 'hsl(92 28% 60%)', good: 'hsl(92 28% 60%)', 'at-risk': 'hsl(14 51% 60%)', warning: 'hsl(14 51% 60%)', critical: 'hsl(354 42% 45%)', blocked: 'hsl(354 42% 45%)' }

// ─── Theme shortcuts ─────────────────────────────────────────────────────────
const bg = 'hsl(220 16% 13%)'
const fg = 'hsl(219 28% 88%)'
const card = 'hsl(220 16% 16%)'
const muted = 'hsl(219 14% 65%)'
const accent = 'hsl(213 32% 52%)'
const border = 'hsl(220 16% 22%)'
const input = 'hsl(220 16% 28%)'
const mutedBg = 'hsl(220 16% 26%)'
const sidebarBg = 'hsl(220 16% 14%)'
const sidebarBorder = 'hsl(220 16% 20%)'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function loadState<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback } catch { return fallback }
}
function saveState(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

const SAMPLE_DEVELOPERS: Developer[] = [
  { name: 'Sarah Chen', email: 'sarah@company.com', skillTags: ['backend', 'auth', 'database'], maxCapacity: 5, activeTickets: 2 },
  { name: 'Marcus Rivera', email: 'marcus@company.com', skillTags: ['frontend', 'mobile', 'testing'], maxCapacity: 4, activeTickets: 1 },
  { name: 'Priya Patel', email: 'priya@company.com', skillTags: ['devops', 'infrastructure', 'security'], maxCapacity: 6, activeTickets: 3 },
  { name: 'Jake Thompson', email: 'jake@company.com', skillTags: ['backend', 'api', 'database'], maxCapacity: 5, activeTickets: 0 },
]
const SAMPLE_TICKETS: Ticket[] = [
  { ticketId: 'ADO-1001', title: 'Fix OAuth2 token refresh', tags: ['backend', 'auth'], priority: 'critical', complexity: 'high', description: 'Token refresh failing', status: 'assigned', assignedTo: 'Sarah Chen', deadline: '2026-03-03', matchedTags: ['backend', 'auth'] },
  { ticketId: 'ADO-1002', title: 'Redesign dashboard layout', tags: ['frontend'], priority: 'medium', complexity: 'medium', description: 'Dashboard responsive overhaul', status: 'in-progress', assignedTo: 'Marcus Rivera', deadline: '2026-03-11', matchedTags: ['frontend'] },
  { ticketId: 'ADO-1003', title: 'Setup CI/CD for staging', tags: ['devops', 'infrastructure'], priority: 'high', complexity: 'high', description: 'Automated staging deployments', status: 'blocked', assignedTo: 'Priya Patel', deadline: '2026-03-06', matchedTags: ['devops', 'infrastructure'] },
  { ticketId: 'ADO-1004', title: 'Add pagination to user list', tags: ['backend', 'api'], priority: 'low', complexity: 'low', description: 'Server-side pagination', status: 'unassigned' },
  { ticketId: 'ADO-1005', title: 'Database index optimization', tags: ['database'], priority: 'high', complexity: 'medium', description: 'Slow queries', status: 'completed', assignedTo: 'Jake Thompson', deadline: '2026-02-28', matchedTags: ['database'] },
]
const SAMPLE_ASSIGNMENTS: Assignment[] = [
  { ticketId: 'ADO-1001', title: 'Fix OAuth2 token refresh', assignedTo: 'Sarah Chen', assignedEmail: 'sarah@company.com', matchedTags: ['backend', 'auth'], deadline: '2026-03-03', priority: 'critical', reasoning: 'Best skill match' },
  { ticketId: 'ADO-1002', title: 'Redesign dashboard layout', assignedTo: 'Marcus Rivera', assignedEmail: 'marcus@company.com', matchedTags: ['frontend'], deadline: '2026-03-11', priority: 'medium', reasoning: 'Primary frontend dev' },
]
const SAMPLE_CHECKINS: CheckIn[] = [
  { developerName: 'Sarah Chen', date: '2026-02-28', ticketUpdates: [{ ticketId: 'ADO-1001', title: 'Fix OAuth2 token refresh', status: 'in-progress', percentComplete: 65, notes: 'Root cause identified' }], blockers: [], accomplishments: ['Identified root cause of token refresh bug'], overallHealth: 'healthy', parsedSummary: 'Good progress on auth bug fix.' },
  { developerName: 'Priya Patel', date: '2026-02-28', ticketUpdates: [{ ticketId: 'ADO-1003', title: 'Setup CI/CD', status: 'blocked', percentComplete: 40, notes: 'Waiting for AWS credentials' }], blockers: [{ description: 'Waiting for AWS credentials', severity: 'high', relatedTicket: 'ADO-1003' }], accomplishments: ['Completed pipeline config'], overallHealth: 'at-risk', parsedSummary: 'Blocked on CI/CD setup.' },
]
const DEFAULT_DEADLINE_RULES: DeadlineRule[] = [
  { priority: 'critical', days: 2 }, { priority: 'high', days: 5 }, { priority: 'medium', days: 10 }, { priority: 'low', days: 15 },
]

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Page() {
  const [mounted, setMounted] = useState(false)
  const [activeView, setActiveView] = useState('dashboard')
  const [sampleMode, setSampleMode] = useState(false)
  const [developers, setDevelopers] = useState<Developer[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [deadlineRules, setDeadlineRules] = useState<DeadlineRule[]>(DEFAULT_DEADLINE_RULES)
  const [ticketLoading, setTicketLoading] = useState(false)
  const [checkInLoading, setCheckInLoading] = useState(false)
  const [dashboardStatus, setDashboardStatus] = useState('')
  const [checkInStatus, setCheckInStatus] = useState('')
  const [agentStatus, setAgentStatus] = useState({ ticketAgent: false, checkInAgent: false })

  useEffect(() => {
    setDevelopers(loadState<Developer[]>('dtc_developers', []))
    setTickets(loadState<Ticket[]>('dtc_tickets', []))
    setAssignments(loadState<Assignment[]>('dtc_assignments', []))
    setCheckIns(loadState<CheckIn[]>('dtc_checkins', []))
    setDeadlineRules(loadState<DeadlineRule[]>('dtc_deadline_rules', DEFAULT_DEADLINE_RULES))
    setMounted(true)
  }, [])

  useEffect(() => { if (mounted) saveState('dtc_developers', developers) }, [developers, mounted])
  useEffect(() => { if (mounted) saveState('dtc_tickets', tickets) }, [tickets, mounted])
  useEffect(() => { if (mounted) saveState('dtc_assignments', assignments) }, [assignments, mounted])
  useEffect(() => { if (mounted) saveState('dtc_checkins', checkIns) }, [checkIns, mounted])
  useEffect(() => { if (mounted) saveState('dtc_deadline_rules', deadlineRules) }, [deadlineRules, mounted])

  const dDevs = sampleMode ? SAMPLE_DEVELOPERS : developers
  const dTickets = sampleMode ? SAMPLE_TICKETS : tickets
  const dAssigns = sampleMode ? SAMPLE_ASSIGNMENTS : assignments
  const dChecks = sampleMode ? SAMPLE_CHECKINS : checkIns

  const handleProcessTickets = async () => {
    const unassigned = tickets.filter(t => t.status === 'unassigned')
    if (unassigned.length === 0 || developers.length === 0) return
    setTicketLoading(true); setDashboardStatus(''); setAgentStatus(p => ({ ...p, ticketAgent: true }))
    try {
      const msg = JSON.stringify({
        tickets: unassigned.map(t => ({ ticketId: t.ticketId, title: t.title, tags: t.tags, priority: t.priority, complexity: t.complexity, description: t.description })),
        developers: developers.map(d => ({ name: d.name, email: d.email, skillTags: d.skillTags, maxCapacity: d.maxCapacity, activeTickets: d.activeTickets + tickets.filter(t2 => t2.assignedTo === d.name && t2.status !== 'completed').length })),
      })
      const result = await callAIAgent(msg, TICKET_AGENT_ID)
      if (result.success) {
        const parsed = parseLLMJson(result.response?.result || result.response)
        const na = Array.isArray(parsed?.assignments) ? parsed.assignments : []
        setAssignments(prev => [...prev, ...na])
        setTickets(prev => prev.map(t => { const a = na.find((a2: any) => a2.ticketId === t.ticketId); return a ? { ...t, status: 'assigned', assignedTo: a.assignedTo, assignedEmail: a.assignedEmail, deadline: a.deadline, matchedTags: a.matchedTags, reasoning: a.reasoning } : t }))
        const s = parsed?.summary; setDashboardStatus(`Processed ${s?.totalProcessed ?? na.length} tickets. ${s?.totalAssigned ?? na.length} assigned.`)
      } else { setDashboardStatus('Failed to process tickets.') }
    } catch { setDashboardStatus('Error processing tickets.') }
    setTicketLoading(false); setAgentStatus(p => ({ ...p, ticketAgent: false }))
  }

  const handleSubmitCheckIn = async (devName: string, summary: string) => {
    setCheckInLoading(true); setCheckInStatus(''); setAgentStatus(p => ({ ...p, checkInAgent: true }))
    const today = new Date().toISOString().split('T')[0]
    try {
      const result = await callAIAgent(`Developer: ${devName}\nDate: ${today}\nSummary: ${summary}`, CHECKIN_AGENT_ID)
      if (result.success) {
        const parsed = parseLLMJson(result.response?.result || result.response)
        const ci: CheckIn = { developerName: parsed?.developerName ?? devName, date: parsed?.date ?? today, ticketUpdates: Array.isArray(parsed?.ticketUpdates) ? parsed.ticketUpdates : [], blockers: Array.isArray(parsed?.blockers) ? parsed.blockers : [], accomplishments: Array.isArray(parsed?.accomplishments) ? parsed.accomplishments : [], overallHealth: parsed?.overallHealth ?? 'unknown', parsedSummary: parsed?.parsedSummary ?? summary }
        setCheckIns(prev => [ci, ...prev])
        if (Array.isArray(parsed?.ticketUpdates)) { setTickets(prev => prev.map(t => { const u = parsed.ticketUpdates.find((x: any) => x.ticketId === t.ticketId); return u ? { ...t, status: u.status === 'blocked' ? 'blocked' : u.percentComplete >= 100 ? 'completed' : 'in-progress' } : t })) }
        setCheckInStatus('Check-in parsed successfully.')
      } else { setCheckInStatus('Failed to parse check-in.') }
    } catch { setCheckInStatus('Error submitting check-in.') }
    setCheckInLoading(false); setAgentStatus(p => ({ ...p, checkInAgent: false }))
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg, color: fg }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: accent, borderTopColor: 'transparent' }} />
          <p className="text-sm font-sans" style={{ color: muted }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex font-sans" style={{ background: bg, color: fg }}>
      {/* ─── SIDEBAR ─── */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r" style={{ background: sidebarBg, borderColor: sidebarBorder }}>
        <div className="p-4 flex items-center gap-2 border-b" style={{ borderColor: sidebarBorder }}>
          <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: accent }}><FiTerminal className="w-4 h-4 text-white" /></div>
          <div><h1 className="font-sans font-semibold text-sm" style={{ color: fg }}>Ticket Commander</h1></div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {[{ id: 'dashboard', label: 'Dashboard', icon: FiGrid }, { id: 'checkins', label: 'Check-Ins', icon: FiCheckCircle }, { id: 'settings', label: 'Settings', icon: FiSettings }].map(item => (
            <button key={item.id} onClick={() => setActiveView(item.id)} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-sans font-medium transition-all" style={{ background: activeView === item.id ? accent : 'transparent', color: activeView === item.id ? 'white' : muted }}>
              <item.icon className="w-4 h-4" />{item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t" style={{ borderColor: sidebarBorder }}>
          <p className="text-xs font-sans font-medium mb-2" style={{ color: muted }}>Agent Status</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: agentStatus.ticketAgent ? 'hsl(92 28% 60%)' : muted }} /><span className="text-xs font-sans" style={{ color: fg }}>Ticket Assignment</span></div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: agentStatus.checkInAgent ? 'hsl(92 28% 60%)' : muted }} /><span className="text-xs font-sans" style={{ color: fg }}>Daily Check-In</span></div>
          </div>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 flex items-center justify-between px-6 border-b flex-shrink-0" style={{ borderColor: border, background: card }}>
          <h2 className="text-sm font-sans font-semibold capitalize" style={{ color: fg }}>{activeView === 'checkins' ? 'Check-Ins' : activeView}</h2>
          <div className="flex items-center gap-3">
            <label className="text-xs font-sans" style={{ color: muted }}>Sample Data</label>
            <button onClick={() => setSampleMode(!sampleMode)} className="w-10 h-5 rounded-full relative transition-colors" style={{ background: sampleMode ? accent : mutedBg }}>
              <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow" style={{ left: sampleMode ? '22px' : '2px' }} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeView === 'dashboard' && <DashboardView developers={dDevs} tickets={dTickets} assignments={dAssigns} loading={ticketLoading} statusMessage={dashboardStatus} onProcessTickets={handleProcessTickets} onAddTicket={(t: Ticket) => setTickets(p => [...p, t])} sampleMode={sampleMode} />}
          {activeView === 'checkins' && <CheckInsView developers={dDevs} checkIns={dChecks} loading={checkInLoading} statusMessage={checkInStatus} onSubmitCheckIn={handleSubmitCheckIn} />}
          {activeView === 'settings' && <SettingsView developers={sampleMode ? SAMPLE_DEVELOPERS : developers} deadlineRules={deadlineRules} onAddDeveloper={(d: Developer) => setDevelopers(p => [...p, d])} onRemoveDeveloper={(e: string) => setDevelopers(p => p.filter(d => d.email !== e))} onUpdateDeveloper={(e: string, d: Developer) => setDevelopers(p => p.map(x => x.email === e ? d : x))} onUpdateDeadlineRules={setDeadlineRules} />}
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD VIEW
// ═════════════════════════════════════════════════════════════════════════════
function DashboardView({ developers, tickets, assignments, loading, statusMessage, onProcessTickets, onAddTicket, sampleMode }: { developers: Developer[]; tickets: Ticket[]; assignments: Assignment[]; loading: boolean; statusMessage: string; onProcessTickets: () => void; onAddTicket: (t: Ticket) => void; sampleMode: boolean }) {
  const [sortField, setSortField] = useState('status')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [showAdd, setShowAdd] = useState(false)
  const [nf, setNf] = useState({ ticketId: '', title: '', tags: [] as string[], priority: 'medium', complexity: 'medium', description: '' })

  const unassigned = tickets.filter(t => t.status === 'unassigned').length
  const inProgress = tickets.filter(t => t.status === 'in-progress').length
  const blocked = tickets.filter(t => t.status === 'blocked').length
  const completed = tickets.filter(t => t.status === 'completed').length

  const allT = tickets.map(t => { const a = assignments.find(a2 => a2.ticketId === t.ticketId); return { ...t, assignedTo: a?.assignedTo ?? t.assignedTo ?? '', deadline: a?.deadline ?? t.deadline ?? '', matchedTags: a?.matchedTags ?? t.matchedTags ?? t.tags } })
  const sorted = [...allT].sort((a, b) => { const av = (a as any)[sortField] ?? ''; const bv = (b as any)[sortField] ?? ''; const c = String(av).localeCompare(String(bv)); return sortDir === 'asc' ? c : -c })
  const handleSort = (f: string) => { if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir('asc') } }

  const stats = [
    { label: 'Unassigned', value: unassigned, color: muted, icon: FiClock },
    { label: 'In Progress', value: inProgress, color: 'hsl(193 43% 65%)', icon: FiActivity },
    { label: 'Blocked', value: blocked, color: 'hsl(354 42% 45%)', icon: FiAlertTriangle },
    { label: 'Completed', value: completed, color: 'hsl(92 28% 60%)', icon: FiCheckCircle },
  ]

  return (
    <>
      {developers.length === 0 && <AlertBanner color="hsl(14 51% 60%)" text="No developers configured. Visit Settings first to add developer profiles." />}
      {blocked > 0 && <AlertBanner color="hsl(354 42% 45%)" text={`${blocked} ticket(s) are currently blocked. Review check-ins for details.`} />}
      {statusMessage && <AlertBanner color={accent} text={statusMessage} icon={<FiCheckCircle className="w-4 h-4 flex-shrink-0" />} />}

      {/* Add Ticket Form */}
      {!sampleMode && (
        <div className="rounded-md border" style={{ background: card, borderColor: border }}>
          <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: border }}>
            <h3 className="text-xs font-sans font-semibold" style={{ color: fg }}>Add Ticket</h3>
            <button onClick={() => setShowAdd(!showAdd)} className="p-1 rounded" style={{ color: accent }}>{showAdd ? <FiX className="w-3.5 h-3.5" /> : <FiPlus className="w-3.5 h-3.5" />}</button>
          </div>
          {showAdd && (
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input value={nf.ticketId} onChange={e => setNf(p => ({ ...p, ticketId: e.target.value }))} placeholder="ADO-1234" className="h-8 px-2 rounded-md text-xs font-mono border outline-none" style={{ background: input, color: fg, borderColor: border }} />
                <input value={nf.title} onChange={e => setNf(p => ({ ...p, title: e.target.value }))} placeholder="Ticket title" className="h-8 px-2 rounded-md text-xs font-sans border outline-none" style={{ background: input, color: fg, borderColor: border }} />
              </div>
              <input value={nf.description} onChange={e => setNf(p => ({ ...p, description: e.target.value }))} placeholder="Description" className="w-full h-8 px-2 rounded-md text-xs font-sans border outline-none" style={{ background: input, color: fg, borderColor: border }} />
              <div className="flex gap-2">
                <select value={nf.priority} onChange={e => setNf(p => ({ ...p, priority: e.target.value }))} className="h-8 px-2 rounded-md text-xs font-sans border outline-none" style={{ background: input, color: fg, borderColor: border }}>{PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select>
                <select value={nf.complexity} onChange={e => setNf(p => ({ ...p, complexity: e.target.value }))} className="h-8 px-2 rounded-md text-xs font-sans border outline-none" style={{ background: input, color: fg, borderColor: border }}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select>
              </div>
              <div><span className="text-xs font-sans mb-1 block" style={{ color: muted }}>Tags</span>
                <div className="flex flex-wrap gap-1">{ALL_TAGS.map(tag => (<button key={tag} onClick={() => setNf(p => ({ ...p, tags: p.tags.includes(tag) ? p.tags.filter(t => t !== tag) : [...p.tags, tag] }))} className="px-1.5 py-0.5 rounded text-xs font-sans transition-all" style={{ background: nf.tags.includes(tag) ? accent : mutedBg, color: nf.tags.includes(tag) ? 'white' : muted }}>{tag}</button>))}</div>
              </div>
              <button onClick={() => { if (nf.ticketId && nf.title) { onAddTicket({ ...nf, status: 'unassigned' }); setNf({ ticketId: '', title: '', tags: [], priority: 'medium', complexity: 'medium', description: '' }); setShowAdd(false) } }} disabled={!nf.ticketId || !nf.title} className="h-7 px-3 text-xs font-sans rounded-md flex items-center gap-1 disabled:opacity-50" style={{ background: accent, color: 'white' }}><FiPlus className="w-3 h-3" /> Add Ticket</button>
            </div>
          )}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="rounded-md p-4 border" style={{ background: card, borderColor: border }}>
            <div className="flex items-center justify-between mb-2"><span className="text-xs font-sans font-medium" style={{ color: muted }}>{s.label}</span><s.icon className="w-4 h-4" style={{ color: s.color }} /></div>
            <p className="text-2xl font-sans font-semibold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Ticket Table + Workload */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-md border" style={{ background: card, borderColor: border }}>
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: border }}>
            <h2 className="text-sm font-sans font-semibold" style={{ color: fg }}>Assignment Log</h2>
            <button onClick={onProcessTickets} disabled={loading || developers.length === 0 || unassigned === 0} className="h-8 px-3 text-xs font-sans font-medium rounded-md flex items-center gap-1 disabled:opacity-50" style={{ background: accent, color: 'white' }}>
              {loading ? <><FiLoader className="w-3 h-3 animate-spin" /> Processing...</> : 'Process New Tickets'}
            </button>
          </div>
          {sorted.length === 0 ? (
            <div className="p-8 text-center"><p className="text-sm font-sans" style={{ color: muted }}>No tickets yet. Add tickets above or enable Sample Data.</p></div>
          ) : (
            <div className="overflow-auto max-h-96">
              <table className="w-full text-xs font-sans">
                <thead><tr style={{ borderBottom: `1px solid ${border}` }}>
                  {[{ key: 'ticketId', label: 'ID' }, { key: 'title', label: 'Title' }, { key: 'tags', label: 'Tags' }, { key: 'assignedTo', label: 'Assignee' }, { key: 'deadline', label: 'Deadline' }, { key: 'status', label: 'Status' }].map(col => (
                    <th key={col.key} className="px-3 py-2 text-left cursor-pointer select-none font-medium" style={{ color: muted }} onClick={() => handleSort(col.key)}>{col.label}{sortField === col.key && (sortDir === 'asc' ? <FiArrowUp className="w-3 h-3 inline ml-1" /> : <FiArrowDown className="w-3 h-3 inline ml-1" />)}</th>
                  ))}
                </tr></thead>
                <tbody>{sorted.map(t => (
                  <tr key={t.ticketId} style={{ borderBottom: `1px solid ${border}` }}>
                    <td className="px-3 py-2 font-mono" style={{ color: accent }}>{t.ticketId}</td>
                    <td className="px-3 py-2" style={{ color: fg }}>{t.title}</td>
                    <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{Array.isArray(t.matchedTags) && t.matchedTags.map((tag, i) => <span key={i} className="px-1.5 py-0.5 rounded text-xs" style={{ background: mutedBg, color: 'hsl(193 43% 65%)' }}>{tag}</span>)}</div></td>
                    <td className="px-3 py-2" style={{ color: fg }}>{t.assignedTo || '-'}</td>
                    <td className="px-3 py-2" style={{ color: muted }}>{t.deadline || '-'}</td>
                    <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${STATUS_COLORS[t.status] ?? muted}22`, color: STATUS_COLORS[t.status] ?? muted }}>{t.status}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>

        {/* Workload Panel */}
        <div className="rounded-md border" style={{ background: card, borderColor: border }}>
          <div className="p-4 border-b" style={{ borderColor: border }}><h2 className="text-sm font-sans font-semibold" style={{ color: fg }}>Developer Workload</h2></div>
          {developers.length === 0 ? <div className="p-8 text-center"><p className="text-sm font-sans" style={{ color: muted }}>No developers configured yet.</p></div> : (
            <div className="p-4 space-y-4">{developers.map(dev => {
              const active = tickets.filter(t => t.assignedTo === dev.name && t.status !== 'completed').length + (dev.activeTickets || 0)
              const pct = dev.maxCapacity > 0 ? Math.min((active / dev.maxCapacity) * 100, 100) : 0
              const barColor = pct > 80 ? 'hsl(354 42% 45%)' : pct > 50 ? 'hsl(14 51% 60%)' : 'hsl(92 28% 60%)'
              return (<div key={dev.email}>
                <div className="flex items-center justify-between mb-1"><span className="text-xs font-sans font-medium" style={{ color: fg }}>{dev.name}</span><span className="text-xs font-mono" style={{ color: muted }}>{active}/{dev.maxCapacity}</span></div>
                <div className="w-full h-2 rounded-full" style={{ background: mutedBg }}><div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} /></div>
                <div className="flex flex-wrap gap-1 mt-1">{Array.isArray(dev.skillTags) && dev.skillTags.map((tag, i) => <span key={i} className="text-xs px-1 py-0.5 rounded" style={{ background: mutedBg, color: muted }}>{tag}</span>)}</div>
              </div>)
            })}</div>
          )}
        </div>
      </div>
    </>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// CHECK-INS VIEW
// ═════════════════════════════════════════════════════════════════════════════
function CheckInsView({ developers, checkIns, loading, statusMessage, onSubmitCheckIn }: { developers: Developer[]; checkIns: CheckIn[]; loading: boolean; statusMessage: string; onSubmitCheckIn: (devName: string, summary: string) => void }) {
  const [selectedDev, setSelectedDev] = useState('')
  const [summary, setSummary] = useState('')
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [logs, setLogs] = useState<ExecutionLog[]>([])
  const [schedLoading, setSchedLoading] = useState(false)
  const [todayStr, setTodayStr] = useState('')

  useEffect(() => {
    setTodayStr(new Date().toISOString().split('T')[0])
    loadSched()
  }, [])

  const loadSched = async () => {
    try {
      const s = await getSchedule(SCHEDULE_ID); if (s.success && s.schedule) setSchedule(s.schedule)
      const l = await getScheduleLogs(SCHEDULE_ID, { limit: 5 }); if (l.success && Array.isArray(l.executions)) setLogs(l.executions)
    } catch {}
  }

  const toggleSched = async () => {
    if (!schedule) return; setSchedLoading(true)
    try {
      if (schedule.is_active) { const r = await pauseSchedule(SCHEDULE_ID); if (r.success) setSchedule(p => p ? { ...p, is_active: false } : null) }
      else { const r = await resumeSchedule(SCHEDULE_ID); if (r.success) setSchedule(p => p ? { ...p, is_active: true } : null) }
      await loadSched()
    } catch {}
    setSchedLoading(false)
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Form */}
        <div className="rounded-md border p-5 space-y-4" style={{ background: card, borderColor: border }}>
          <h2 className="text-sm font-sans font-semibold" style={{ color: fg }}>Submit Daily Check-In</h2>
          {statusMessage && <AlertBanner color={accent} text={statusMessage} icon={<FiCheckCircle className="w-3 h-3" />} small />}
          <div>
            <label className="text-xs font-sans font-medium mb-1 block" style={{ color: muted }}>Developer</label>
            <select value={selectedDev} onChange={e => setSelectedDev(e.target.value)} className="w-full h-9 px-3 rounded-md text-sm font-sans border outline-none" style={{ background: input, color: fg, borderColor: border }}>
              <option value="">Select developer...</option>
              {developers.map(d => <option key={d.email} value={d.name}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-sans font-medium mb-1 block" style={{ color: muted }}>Date</label>
            <div className="flex items-center gap-2 h-9 px-3 rounded-md text-sm font-sans border" style={{ background: input, color: fg, borderColor: border }}><FiCalendar className="w-3 h-3" style={{ color: muted }} />{todayStr || 'Loading...'}</div>
          </div>
          <div>
            <label className="text-xs font-sans font-medium mb-1 block" style={{ color: muted }}>What did you work on? Any blockers?</label>
            <textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Worked on ADO-1234 auth bug fix, about 60% done..." rows={5} className="w-full px-3 py-2 rounded-md text-sm font-sans border resize-none outline-none" style={{ background: input, color: fg, borderColor: border }} />
          </div>
          <button onClick={() => { if (selectedDev && summary.trim()) { onSubmitCheckIn(selectedDev, summary); setSummary('') } }} disabled={loading || !selectedDev || !summary.trim()} className="w-full h-9 text-sm font-sans font-medium rounded-md flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: accent, color: 'white' }}>
            {loading ? <><FiLoader className="w-3 h-3 animate-spin" /> Parsing...</> : <><FiSend className="w-3 h-3" /> Submit Check-In</>}
          </button>
          {developers.length === 0 && <p className="text-xs font-sans text-center" style={{ color: muted }}>Add developers in Settings first.</p>}
        </div>

        {/* History */}
        <div className="rounded-md border" style={{ background: card, borderColor: border }}>
          <div className="p-4 border-b" style={{ borderColor: border }}><h2 className="text-sm font-sans font-semibold" style={{ color: fg }}>Check-In History</h2></div>
          {checkIns.length === 0 ? <div className="p-8 text-center"><p className="text-sm font-sans" style={{ color: muted }}>No check-ins recorded.</p></div> : (
            <div className="overflow-auto max-h-96 p-4 space-y-3">
              {checkIns.map((ci, idx) => {
                const hc = HEALTH_COLORS[ci.overallHealth?.toLowerCase()] ?? muted
                return (
                  <div key={idx} className="rounded-md border p-3 space-y-2" style={{ borderColor: border, background: bg }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-sans font-semibold" style={{ color: fg }}>{ci.developerName ?? 'Unknown'}</span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${hc}22`, color: hc }}>{ci.overallHealth ?? '-'}</span>
                        <span className="text-xs font-mono" style={{ color: muted }}>{ci.date}</span>
                      </div>
                    </div>
                    {ci.parsedSummary && <p className="text-xs font-sans" style={{ color: muted }}>{ci.parsedSummary}</p>}
                    {Array.isArray(ci.ticketUpdates) && ci.ticketUpdates.length > 0 && <div className="space-y-1">{ci.ticketUpdates.map((tu, j) => (<div key={j} className="flex items-center gap-2 text-xs font-sans"><span className="font-mono" style={{ color: accent }}>{tu.ticketId}</span><span style={{ color: fg }}>{tu.title}</span><span className="ml-auto px-1.5 py-0.5 rounded text-xs" style={{ background: mutedBg, color: 'hsl(193 43% 65%)' }}>{tu.status}</span><span style={{ color: muted }}>{tu.percentComplete ?? 0}%</span></div>))}</div>}
                    {Array.isArray(ci.blockers) && ci.blockers.length > 0 && <div className="space-y-1">{ci.blockers.map((b, j) => (<div key={j} className="flex items-center gap-2 text-xs font-sans px-2 py-1 rounded" style={{ background: 'hsla(354,42%,45%,0.1)' }}><FiAlertTriangle className="w-3 h-3" style={{ color: 'hsl(354 42% 45%)' }} /><span style={{ color: 'hsl(354 42% 45%)' }}>{b.description}</span></div>))}</div>}
                    {Array.isArray(ci.accomplishments) && ci.accomplishments.length > 0 && <div className="space-y-0.5">{ci.accomplishments.map((a, j) => (<div key={j} className="flex items-start gap-2 text-xs font-sans"><FiCheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: 'hsl(92 28% 60%)' }} /><span style={{ color: fg }}>{a}</span></div>))}</div>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Panel */}
      <div className="rounded-md border p-5" style={{ background: card, borderColor: border }}>
        <div className="flex items-center justify-between mb-4">
          <div><h2 className="text-sm font-sans font-semibold" style={{ color: fg }}>Daily Check-In Schedule</h2><p className="text-xs font-sans mt-1" style={{ color: muted }}>{schedule?.cron_expression ? cronToHuman(schedule.cron_expression) : 'Daily at 9:00 AM'} ({schedule?.timezone ?? 'America/New_York'})</p></div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-sans" style={{ color: muted }}>{schedule?.is_active ? 'Active' : 'Paused'}</span>
            <button onClick={toggleSched} disabled={schedLoading} className="w-10 h-5 rounded-full relative transition-colors" style={{ background: schedule?.is_active ? 'hsl(92 28% 60%)' : mutedBg }}><span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow" style={{ left: schedule?.is_active ? '22px' : '2px' }} /></button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs font-sans">
          <div className="rounded-md p-3 border" style={{ background: bg, borderColor: border }}><span style={{ color: muted }}>Status</span><p className="font-medium mt-1" style={{ color: schedule?.is_active ? 'hsl(92 28% 60%)' : 'hsl(14 51% 60%)' }}>{schedule?.is_active ? 'Active' : 'Paused'}</p></div>
          <div className="rounded-md p-3 border" style={{ background: bg, borderColor: border }}><span style={{ color: muted }}>Next Run</span><p className="font-medium mt-1" style={{ color: fg }}>{schedule?.next_run_time ? new Date(schedule.next_run_time).toLocaleString() : 'N/A'}</p></div>
        </div>
        {logs.length > 0 && <div className="mt-3"><p className="text-xs font-sans font-medium mb-2" style={{ color: muted }}>Recent Runs</p><div className="space-y-1">{logs.map((log, i) => (<div key={i} className="flex items-center gap-2 text-xs font-sans px-2 py-1.5 rounded" style={{ background: bg }}>{log.success ? <FiCheckCircle className="w-3 h-3" style={{ color: 'hsl(92 28% 60%)' }} /> : <FiAlertTriangle className="w-3 h-3" style={{ color: 'hsl(354 42% 45%)' }} />}<span style={{ color: fg }}>{new Date(log.executed_at).toLocaleString()}</span><span className="ml-auto" style={{ color: log.success ? 'hsl(92 28% 60%)' : 'hsl(354 42% 45%)' }}>{log.success ? 'Success' : 'Failed'}</span></div>))}</div></div>}
      </div>
    </>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// SETTINGS VIEW
// ═════════════════════════════════════════════════════════════════════════════
function SettingsView({ developers, deadlineRules, onAddDeveloper, onRemoveDeveloper, onUpdateDeveloper, onUpdateDeadlineRules }: { developers: Developer[]; deadlineRules: DeadlineRule[]; onAddDeveloper: (d: Developer) => void; onRemoveDeveloper: (e: string) => void; onUpdateDeveloper: (e: string, d: Developer) => void; onUpdateDeadlineRules: (r: DeadlineRule[]) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [capacity, setCapacity] = useState('5')
  const [editingEmail, setEditingEmail] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Developer | null>(null)
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [logs, setLogs] = useState<ExecutionLog[]>([])
  const [schedLoading, setSchedLoading] = useState(false)

  useEffect(() => { loadSched() }, [])

  const loadSched = async () => {
    try {
      const s = await getSchedule(SCHEDULE_ID); if (s.success && s.schedule) setSchedule(s.schedule)
      const l = await getScheduleLogs(SCHEDULE_ID, { limit: 5 }); if (l.success && Array.isArray(l.executions)) setLogs(l.executions)
    } catch {}
  }

  const toggleSched = async () => {
    if (!schedule) return; setSchedLoading(true)
    try {
      if (schedule.is_active) { const r = await pauseSchedule(SCHEDULE_ID); if (r.success) setSchedule(p => p ? { ...p, is_active: false } : null) }
      else { const r = await resumeSchedule(SCHEDULE_ID); if (r.success) setSchedule(p => p ? { ...p, is_active: true } : null) }
      await loadSched()
    } catch {}
    setSchedLoading(false)
  }

  const handleAdd = () => {
    if (!name.trim() || !email.trim()) return
    onAddDeveloper({ name: name.trim(), email: email.trim(), skillTags: tags, maxCapacity: parseInt(capacity) || 5, activeTickets: 0 })
    setName(''); setEmail(''); setTags([]); setCapacity('5')
  }

  return (
    <>
      {/* Add Developer */}
      <div className="rounded-md border p-5" style={{ background: card, borderColor: border }}>
        <h2 className="text-sm font-sans font-semibold mb-4" style={{ color: fg }}>Add Developer</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className="text-xs font-sans font-medium mb-1 block" style={{ color: muted }}>Name *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" className="w-full h-9 px-3 text-sm font-sans rounded-md border outline-none" style={{ background: input, color: fg, borderColor: border }} /></div>
          <div><label className="text-xs font-sans font-medium mb-1 block" style={{ color: muted }}>Email *</label><input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="john@company.com" className="w-full h-9 px-3 text-sm font-sans rounded-md border outline-none" style={{ background: input, color: fg, borderColor: border }} /></div>
        </div>
        <div className="mt-3"><label className="text-xs font-sans font-medium mb-1 block" style={{ color: muted }}>Skill Tags</label>
          <div className="flex flex-wrap gap-1.5">{ALL_TAGS.map(tag => (<button key={tag} onClick={() => setTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag])} className="px-2 py-1 rounded text-xs font-sans transition-all" style={{ background: tags.includes(tag) ? accent : mutedBg, color: tags.includes(tag) ? 'white' : muted }}>{tag}</button>))}</div>
        </div>
        <div className="mt-3 flex items-end gap-3">
          <div><label className="text-xs font-sans font-medium mb-1 block" style={{ color: muted }}>Max Capacity</label><input value={capacity} onChange={e => setCapacity(e.target.value)} type="number" min="1" max="20" className="h-9 w-24 px-3 text-sm font-sans rounded-md border outline-none" style={{ background: input, color: fg, borderColor: border }} /></div>
          <button onClick={handleAdd} disabled={!name.trim() || !email.trim()} className="h-9 px-4 text-xs font-sans font-medium rounded-md flex items-center gap-1 disabled:opacity-50" style={{ background: accent, color: 'white' }}><FiPlus className="w-3 h-3" /> Add Developer</button>
        </div>
      </div>

      {/* Developer Cards */}
      <div className="rounded-md border" style={{ background: card, borderColor: border }}>
        <div className="p-4 border-b" style={{ borderColor: border }}><h2 className="text-sm font-sans font-semibold" style={{ color: fg }}>Developer Profiles ({developers.length})</h2></div>
        {developers.length === 0 ? <div className="p-8 text-center"><p className="text-sm font-sans" style={{ color: muted }}>No developers configured. Add your first developer profile.</p></div> : (
          <div className="overflow-auto max-h-80 p-4 space-y-2">
            {developers.map(dev => (
              <div key={dev.email} className="rounded-md border p-3" style={{ borderColor: border, background: bg }}>
                {editingEmail === dev.email && editForm ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input value={editForm.name} onChange={e => setEditForm(p => p ? { ...p, name: e.target.value } : null)} className="h-8 px-2 text-xs border rounded-md outline-none" style={{ background: input, color: fg, borderColor: border }} />
                      <input value={editForm.email} onChange={e => setEditForm(p => p ? { ...p, email: e.target.value } : null)} className="h-8 px-2 text-xs border rounded-md outline-none" style={{ background: input, color: fg, borderColor: border }} />
                    </div>
                    <div className="flex flex-wrap gap-1">{ALL_TAGS.map(tag => (<button key={tag} onClick={() => setEditForm(p => p ? { ...p, skillTags: p.skillTags.includes(tag) ? p.skillTags.filter(t => t !== tag) : [...p.skillTags, tag] } : null)} className="px-1.5 py-0.5 rounded text-xs font-sans" style={{ background: editForm.skillTags.includes(tag) ? accent : mutedBg, color: editForm.skillTags.includes(tag) ? 'white' : muted }}>{tag}</button>))}</div>
                    <div className="flex items-center gap-2">
                      <input value={String(editForm.maxCapacity)} onChange={e => setEditForm(p => p ? { ...p, maxCapacity: parseInt(e.target.value) || 5 } : null)} type="number" className="h-8 w-20 px-2 text-xs border rounded-md outline-none" style={{ background: input, color: fg, borderColor: border }} />
                      <span className="text-xs" style={{ color: muted }}>max tickets</span>
                      <div className="ml-auto flex gap-1">
                        <button onClick={() => { if (editingEmail && editForm) { onUpdateDeveloper(editingEmail, editForm); setEditingEmail(null); setEditForm(null) } }} className="h-7 w-7 p-0 rounded-md flex items-center justify-center" style={{ background: 'hsl(92 28% 60%)', color: 'white' }}><FiCheck className="w-3 h-3" /></button>
                        <button onClick={() => { setEditingEmail(null); setEditForm(null) }} className="h-7 w-7 p-0 rounded-md flex items-center justify-center" style={{ background: 'hsl(354 42% 45%)', color: 'white' }}><FiX className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: mutedBg }}><FiUser className="w-4 h-4" style={{ color: accent }} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-sans font-medium" style={{ color: fg }}>{dev.name}</p>
                      <p className="text-xs font-sans" style={{ color: muted }}>{dev.email} | Cap: {dev.maxCapacity}</p>
                      <div className="flex flex-wrap gap-1 mt-1">{Array.isArray(dev.skillTags) && dev.skillTags.map((tag, i) => <span key={i} className="px-1.5 py-0.5 rounded text-xs" style={{ background: mutedBg, color: 'hsl(193 43% 65%)' }}>{tag}</span>)}</div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingEmail(dev.email); setEditForm({ ...dev }) }} className="p-1.5 rounded" style={{ color: accent }}><FiEdit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => onRemoveDeveloper(dev.email)} className="p-1.5 rounded" style={{ color: 'hsl(354 42% 45%)' }}><FiTrash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deadline Rules */}
      <div className="rounded-md border p-5" style={{ background: card, borderColor: border }}>
        <h2 className="text-sm font-sans font-semibold mb-3" style={{ color: fg }}>Priority-to-Deadline Rules</h2>
        <div className="space-y-2">{deadlineRules.map(rule => (
          <div key={rule.priority} className="flex items-center gap-3 text-sm font-sans">
            <span className="w-20 capitalize font-medium" style={{ color: fg }}>{rule.priority}</span>
            <input value={String(rule.days)} onChange={e => onUpdateDeadlineRules(deadlineRules.map(r => r.priority === rule.priority ? { ...r, days: parseInt(e.target.value) || 1 } : r))} type="number" min="1" className="h-8 w-20 text-xs text-center border rounded-md outline-none" style={{ background: input, color: fg, borderColor: border }} />
            <span className="text-xs" style={{ color: muted }}>days</span>
          </div>
        ))}</div>
      </div>

      {/* Schedule Management */}
      <div className="rounded-md border p-5" style={{ background: card, borderColor: border }}>
        <div className="flex items-center justify-between mb-4">
          <div><h2 className="text-sm font-sans font-semibold" style={{ color: fg }}>Schedule Management</h2><p className="text-xs font-sans mt-1" style={{ color: muted }}>Daily Check-In Agent | {schedule?.cron_expression ? cronToHuman(schedule.cron_expression) : 'Daily at 9:00 AM'}</p></div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-sans" style={{ color: muted }}>{schedule?.is_active ? 'Active' : 'Paused'}</span>
            <button onClick={toggleSched} disabled={schedLoading} className="w-10 h-5 rounded-full relative transition-colors" style={{ background: schedule?.is_active ? 'hsl(92 28% 60%)' : mutedBg }}><span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow" style={{ left: schedule?.is_active ? '22px' : '2px' }} /></button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs font-sans">
          <div className="rounded-md p-3 border" style={{ background: bg, borderColor: border }}><span style={{ color: muted }}>Status</span><p className="font-medium mt-1" style={{ color: schedule?.is_active ? 'hsl(92 28% 60%)' : 'hsl(14 51% 60%)' }}>{schedule?.is_active ? 'Active' : 'Paused'}</p></div>
          <div className="rounded-md p-3 border" style={{ background: bg, borderColor: border }}><span style={{ color: muted }}>Next Run</span><p className="font-medium mt-1" style={{ color: fg }}>{schedule?.next_run_time ? new Date(schedule.next_run_time).toLocaleString() : 'N/A'}</p></div>
          <div className="rounded-md p-3 border" style={{ background: bg, borderColor: border }}><span style={{ color: muted }}>Last Run</span><p className="font-medium mt-1" style={{ color: fg }}>{schedule?.last_run_at ? new Date(schedule.last_run_at).toLocaleString() : 'Never'}</p></div>
        </div>
        {logs.length > 0 && <div className="mt-3"><p className="text-xs font-sans font-medium mb-2" style={{ color: muted }}>Run History</p><div className="space-y-1">{logs.map((log, i) => (<div key={i} className="flex items-center gap-2 text-xs font-sans px-2 py-1.5 rounded" style={{ background: bg }}><FiCheck className="w-3 h-3" style={{ color: log.success ? 'hsl(92 28% 60%)' : 'hsl(354 42% 45%)' }} /><span style={{ color: fg }}>{new Date(log.executed_at).toLocaleString()}</span><span className="ml-auto" style={{ color: log.success ? 'hsl(92 28% 60%)' : 'hsl(354 42% 45%)' }}>{log.success ? 'Success' : 'Failed'}</span></div>))}</div></div>}
      </div>
    </>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// ALERT BANNER
// ═════════════════════════════════════════════════════════════════════════════
function AlertBanner({ color, text, icon, small }: { color: string; text: string; icon?: React.ReactNode; small?: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-4 ${small ? 'py-2' : 'py-3'} rounded-md ${small ? 'text-xs' : 'text-sm'} font-sans`} style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
      {icon || <FiAlertTriangle className={small ? 'w-3 h-3 flex-shrink-0' : 'w-4 h-4 flex-shrink-0'} />}
      {text}
    </div>
  )
}
