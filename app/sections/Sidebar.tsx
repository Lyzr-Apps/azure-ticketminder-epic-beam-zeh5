'use client'

import React from 'react'
import { FiGrid, FiCheckCircle, FiSettings, FiTerminal } from 'react-icons/fi'

interface SidebarProps {
  activeView: string
  setActiveView: (view: string) => void
  agentStatus: { ticketAgent: boolean; checkInAgent: boolean }
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: FiGrid },
  { id: 'checkins', label: 'Check-Ins', icon: FiCheckCircle },
  { id: 'settings', label: 'Settings', icon: FiSettings },
]

export default function Sidebar({ activeView, setActiveView, agentStatus }: SidebarProps) {
  return (
    <aside className="w-60 flex-shrink-0 flex flex-col border-r" style={{ background: 'hsl(220 16% 14%)', borderColor: 'hsl(220 16% 20%)' }}>
      <div className="p-4 flex items-center gap-2 border-b" style={{ borderColor: 'hsl(220 16% 20%)' }}>
        <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: 'hsl(213 32% 52%)' }}>
          <FiTerminal className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="font-sans font-semibold text-sm" style={{ color: 'hsl(219 28% 88%)' }}>DevOps Ticket</h1>
          <p className="font-sans text-xs" style={{ color: 'hsl(219 14% 65%)' }}>Commander</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-sans font-medium transition-all duration-200"
              style={{
                background: isActive ? 'hsl(213 32% 52%)' : 'transparent',
                color: isActive ? 'hsl(219 28% 95%)' : 'hsl(219 14% 65%)',
              }}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="p-3 border-t" style={{ borderColor: 'hsl(220 16% 20%)' }}>
        <p className="text-xs font-sans font-medium mb-2" style={{ color: 'hsl(219 14% 65%)' }}>Agent Status</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: agentStatus.ticketAgent ? 'hsl(92 28% 60%)' : 'hsl(219 14% 65%)' }} />
            <span className="text-xs font-sans" style={{ color: 'hsl(219 28% 88%)' }}>Ticket Assignment</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: agentStatus.checkInAgent ? 'hsl(92 28% 60%)' : 'hsl(219 14% 65%)' }} />
            <span className="text-xs font-sans" style={{ color: 'hsl(219 28% 88%)' }}>Daily Check-In</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
