'use client'

import React, { useState, useEffect } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import parseLLMJson from '@/lib/jsonParser'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import Sidebar from './sections/Sidebar'
import DashboardSection from './sections/DashboardSection'
import CheckInsSection from './sections/CheckInsSection'
import SettingsSection from './sections/SettingsSection'

// --- Types ---
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

interface CheckIn {
  developerName: string
  date: string
  ticketUpdates: { ticketId: string; title: string; status: string; percentComplete: number; notes: string }[]
  blockers: { description: string; severity: string; relatedTicket: string }[]
  accomplishments: string[]
  overallHealth: string
  parsedSummary: string
}

interface DeadlineRule {
  priority: string
  days: number
}

// --- Agent IDs ---
const TICKET_AGENT_ID = '69a3d988f20444e7993a6f2b'
const CHECKIN_AGENT_ID = '69a3d988778070004ef82c98'

// --- localStorage helpers ---
function loadState<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

function saveState(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
}

// --- Sample Data ---
const SAMPLE_DEVELOPERS: Developer[] = [
  { name: 'Sarah Chen', email: 'sarah@company.com', skillTags: ['backend', 'auth', 'database'], maxCapacity: 5, activeTickets: 2 },
  { name: 'Marcus Rivera', email: 'marcus@company.com', skillTags: ['frontend', 'mobile', 'testing'], maxCapacity: 4, activeTickets: 1 },
  { name: 'Priya Patel', email: 'priya@company.com', skillTags: ['devops', 'infrastructure', 'security'], maxCapacity: 6, activeTickets: 3 },
  { name: 'Jake Thompson', email: 'jake@company.com', skillTags: ['backend', 'api', 'database'], maxCapacity: 5, activeTickets: 0 },
]

const SAMPLE_TICKETS: Ticket[] = [
  { ticketId: 'ADO-1001', title: 'Fix OAuth2 token refresh', tags: ['backend', 'auth'], priority: 'critical', complexity: 'high', description: 'Token refresh failing after 1 hour', status: 'assigned', assignedTo: 'Sarah Chen', deadline: '2026-03-03', matchedTags: ['backend', 'auth'] },
  { ticketId: 'ADO-1002', title: 'Redesign dashboard layout', tags: ['frontend'], priority: 'medium', complexity: 'medium', description: 'Dashboard needs responsive overhaul', status: 'in-progress', assignedTo: 'Marcus Rivera', deadline: '2026-03-11', matchedTags: ['frontend'] },
  { ticketId: 'ADO-1003', title: 'Setup CI/CD for staging', tags: ['devops', 'infrastructure'], priority: 'high', complexity: 'high', description: 'Need automated staging deployments', status: 'blocked', assignedTo: 'Priya Patel', deadline: '2026-03-06', matchedTags: ['devops', 'infrastructure'] },
  { ticketId: 'ADO-1004', title: 'Add pagination to user list', tags: ['backend', 'api'], priority: 'low', complexity: 'low', description: 'User list needs server-side pagination', status: 'unassigned' },
  { ticketId: 'ADO-1005', title: 'Database index optimization', tags: ['database'], priority: 'high', complexity: 'medium', description: 'Slow queries on users table', status: 'completed', assignedTo: 'Jake Thompson', deadline: '2026-02-28', matchedTags: ['database'] },
]

const SAMPLE_ASSIGNMENTS: Assignment[] = [
  { ticketId: 'ADO-1001', title: 'Fix OAuth2 token refresh', assignedTo: 'Sarah Chen', assignedEmail: 'sarah@company.com', matchedTags: ['backend', 'auth'], deadline: '2026-03-03', priority: 'critical', reasoning: 'Best skill match for auth + backend with available capacity' },
  { ticketId: 'ADO-1002', title: 'Redesign dashboard layout', assignedTo: 'Marcus Rivera', assignedEmail: 'marcus@company.com', matchedTags: ['frontend'], deadline: '2026-03-11', priority: 'medium', reasoning: 'Primary frontend developer with lowest workload' },
  { ticketId: 'ADO-1003', title: 'Setup CI/CD for staging', assignedTo: 'Priya Patel', assignedEmail: 'priya@company.com', matchedTags: ['devops', 'infrastructure'], deadline: '2026-03-06', priority: 'high', reasoning: 'DevOps specialist with infrastructure experience' },
]

const SAMPLE_CHECKINS: CheckIn[] = [
  { developerName: 'Sarah Chen', date: '2026-02-28', ticketUpdates: [{ ticketId: 'ADO-1001', title: 'Fix OAuth2 token refresh', status: 'in-progress', percentComplete: 65, notes: 'Root cause identified, implementing fix' }], blockers: [], accomplishments: ['Identified root cause of token refresh bug', 'Set up test environment for auth flows'], overallHealth: 'healthy', parsedSummary: 'Good progress on auth bug fix. Root cause identified and implementation underway.' },
  { developerName: 'Priya Patel', date: '2026-02-28', ticketUpdates: [{ ticketId: 'ADO-1003', title: 'Setup CI/CD for staging', status: 'blocked', percentComplete: 40, notes: 'Waiting for AWS credentials from infra team' }], blockers: [{ description: 'Waiting for AWS staging credentials from infrastructure team', severity: 'high', relatedTicket: 'ADO-1003' }], accomplishments: ['Completed pipeline configuration template'], overallHealth: 'at-risk', parsedSummary: 'Progress blocked on CI/CD setup. Waiting for AWS credentials.' },
]

const DEFAULT_DEADLINE_RULES: DeadlineRule[] = [
  { priority: 'critical', days: 2 },
  { priority: 'high', days: 5 },
  { priority: 'medium', days: 10 },
  { priority: 'low', days: 15 },
]

// --- ErrorBoundary ---
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(220 16% 13%)', color: 'hsl(219 28% 88%)' }}>
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-sans font-semibold mb-2">Something went wrong</h2>
            <p className="text-sm mb-4" style={{ color: 'hsl(219 14% 65%)' }}>{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 rounded-md text-sm font-sans" style={{ background: 'hsl(213 32% 52%)', color: 'white' }}>
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// --- Main Page ---
export default function Page() {
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

  // Load from localStorage on mount
  useEffect(() => {
    setDevelopers(loadState<Developer[]>('dtc_developers', []))
    setTickets(loadState<Ticket[]>('dtc_tickets', []))
    setAssignments(loadState<Assignment[]>('dtc_assignments', []))
    setCheckIns(loadState<CheckIn[]>('dtc_checkins', []))
    setDeadlineRules(loadState<DeadlineRule[]>('dtc_deadline_rules', DEFAULT_DEADLINE_RULES))
  }, [])

  // Persist to localStorage
  useEffect(() => { saveState('dtc_developers', developers) }, [developers])
  useEffect(() => { saveState('dtc_tickets', tickets) }, [tickets])
  useEffect(() => { saveState('dtc_assignments', assignments) }, [assignments])
  useEffect(() => { saveState('dtc_checkins', checkIns) }, [checkIns])
  useEffect(() => { saveState('dtc_deadline_rules', deadlineRules) }, [deadlineRules])

  // Derive display data based on sample mode
  const displayDevelopers = sampleMode ? SAMPLE_DEVELOPERS : developers
  const displayTickets = sampleMode ? SAMPLE_TICKETS : tickets
  const displayAssignments = sampleMode ? SAMPLE_ASSIGNMENTS : assignments
  const displayCheckIns = sampleMode ? SAMPLE_CHECKINS : checkIns

  // --- Process Tickets Handler ---
  const handleProcessTickets = async () => {
    const unassigned = tickets.filter(t => t.status === 'unassigned')
    if (unassigned.length === 0 || developers.length === 0) return

    setTicketLoading(true)
    setDashboardStatus('')
    setAgentStatus(prev => ({ ...prev, ticketAgent: true }))

    try {
      const message = JSON.stringify({
        tickets: unassigned.map(t => ({ ticketId: t.ticketId, title: t.title, tags: t.tags, priority: t.priority, complexity: t.complexity, description: t.description })),
        developers: developers.map(d => ({ name: d.name, email: d.email, skillTags: d.skillTags, maxCapacity: d.maxCapacity, activeTickets: d.activeTickets + tickets.filter(t2 => t2.assignedTo === d.name && t2.status !== 'completed').length })),
      })

      const result = await callAIAgent(message, TICKET_AGENT_ID)

      if (result.success) {
        const parsed = parseLLMJson(result.response?.result || result.response)
        const newAssignments = Array.isArray(parsed?.assignments) ? parsed.assignments : []

        setAssignments(prev => [...prev, ...newAssignments])

        setTickets(prev => prev.map(t => {
          const a = newAssignments.find((a2: Assignment) => a2.ticketId === t.ticketId)
          if (a) {
            return { ...t, status: 'assigned', assignedTo: a.assignedTo, assignedEmail: a.assignedEmail, deadline: a.deadline, matchedTags: a.matchedTags, reasoning: a.reasoning }
          }
          return t
        }))

        const summary = parsed?.summary
        setDashboardStatus(`Processed ${summary?.totalProcessed ?? newAssignments.length} tickets. ${summary?.totalAssigned ?? newAssignments.length} assigned. ${summary?.notes ?? ''}`)
      } else {
        setDashboardStatus('Failed to process tickets. Please try again.')
      }
    } catch {
      setDashboardStatus('Error processing tickets. Please try again.')
    }

    setTicketLoading(false)
    setAgentStatus(prev => ({ ...prev, ticketAgent: false }))
  }

  // --- Submit Check-In Handler ---
  const handleSubmitCheckIn = async (devName: string, summary: string) => {
    setCheckInLoading(true)
    setCheckInStatus('')
    setAgentStatus(prev => ({ ...prev, checkInAgent: true }))

    const today = new Date().toISOString().split('T')[0]

    try {
      const message = `Developer: ${devName}\nDate: ${today}\nSummary: ${summary}`
      const result = await callAIAgent(message, CHECKIN_AGENT_ID)

      if (result.success) {
        const parsed = parseLLMJson(result.response?.result || result.response)
        const newCheckIn: CheckIn = {
          developerName: parsed?.developerName ?? devName,
          date: parsed?.date ?? today,
          ticketUpdates: Array.isArray(parsed?.ticketUpdates) ? parsed.ticketUpdates : [],
          blockers: Array.isArray(parsed?.blockers) ? parsed.blockers : [],
          accomplishments: Array.isArray(parsed?.accomplishments) ? parsed.accomplishments : [],
          overallHealth: parsed?.overallHealth ?? 'unknown',
          parsedSummary: parsed?.parsedSummary ?? summary,
        }

        setCheckIns(prev => [newCheckIn, ...prev])

        if (Array.isArray(parsed?.ticketUpdates)) {
          setTickets(prev => prev.map(t => {
            const update = parsed.ticketUpdates.find((u: any) => u.ticketId === t.ticketId)
            if (update) {
              return { ...t, status: update.status === 'blocked' ? 'blocked' : update.percentComplete >= 100 ? 'completed' : 'in-progress' }
            }
            return t
          }))
        }

        setCheckInStatus('Check-in parsed successfully.')
      } else {
        setCheckInStatus('Failed to parse check-in. Please try again.')
      }
    } catch {
      setCheckInStatus('Error submitting check-in. Please try again.')
    }

    setCheckInLoading(false)
    setAgentStatus(prev => ({ ...prev, checkInAgent: false }))
  }

  // --- Ticket Management ---
  const handleAddTicket = (ticket: Ticket) => {
    setTickets(prev => [...prev, ticket])
  }

  const handleRemoveTicket = (ticketId: string) => {
    setTickets(prev => prev.filter(t => t.ticketId !== ticketId))
  }

  // --- Developer Management ---
  const handleAddDeveloper = (dev: Developer) => {
    setDevelopers(prev => [...prev, dev])
  }

  const handleRemoveDeveloper = (email: string) => {
    setDevelopers(prev => prev.filter(d => d.email !== email))
  }

  const handleUpdateDeveloper = (email: string, updated: Developer) => {
    setDevelopers(prev => prev.map(d => d.email === email ? updated : d))
  }

  const handleUpdateDeadlineRules = (rules: DeadlineRule[]) => {
    setDeadlineRules(rules)
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex font-sans" style={{ background: 'hsl(220 16% 13%)', color: 'hsl(219 28% 88%)' }}>
        <Sidebar activeView={activeView} setActiveView={setActiveView} agentStatus={agentStatus} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-12 flex items-center justify-between px-6 border-b flex-shrink-0" style={{ borderColor: 'hsl(220 16% 22%)', background: 'hsl(220 16% 16%)' }}>
            <h2 className="text-sm font-sans font-semibold capitalize" style={{ color: 'hsl(219 28% 88%)' }}>
              {activeView === 'checkins' ? 'Check-Ins' : activeView}
            </h2>
            <div className="flex items-center gap-2">
              <Label className="text-xs font-sans" style={{ color: 'hsl(219 14% 65%)' }}>Sample Data</Label>
              <Switch checked={sampleMode} onCheckedChange={setSampleMode} />
            </div>
          </header>

          {/* Content */}
          {activeView === 'dashboard' && (
            <DashboardSection
              developers={displayDevelopers}
              tickets={displayTickets}
              assignments={displayAssignments}
              loading={ticketLoading}
              statusMessage={dashboardStatus}
              onProcessTickets={handleProcessTickets}
              onAddTicket={handleAddTicket}
              onRemoveTicket={handleRemoveTicket}
              sampleMode={sampleMode}
            />
          )}

          {activeView === 'checkins' && (
            <CheckInsSection
              developers={displayDevelopers}
              checkIns={displayCheckIns}
              loading={checkInLoading}
              statusMessage={checkInStatus}
              onSubmitCheckIn={handleSubmitCheckIn}
            />
          )}

          {activeView === 'settings' && (
            <SettingsSection
              developers={sampleMode ? SAMPLE_DEVELOPERS : developers}
              deadlineRules={deadlineRules}
              onAddDeveloper={handleAddDeveloper}
              onRemoveDeveloper={handleRemoveDeveloper}
              onUpdateDeveloper={handleUpdateDeveloper}
              onUpdateDeadlineRules={handleUpdateDeadlineRules}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}
