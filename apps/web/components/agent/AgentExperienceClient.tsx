'use client'

import { useState } from 'react'
import { SkillsPanel } from './SkillsPanel'
import { MCPServersPanel } from './MCPServersPanel'
import { SandboxPanel } from './SandboxPanel'

const TABS = [
  { id: 'skills',  label: '⚡ Skills',      hint: 'Custom instructions & tools' },
  { id: 'mcp',     label: '⊕ MCP Servers', hint: 'External tool integrations' },
  { id: 'sandbox', label: '⧉ Sandbox',      hint: 'Take Bobby for a spin' },
]

interface Props {
  leagueId: string
}

export function AgentExperienceClient({ leagueId }: Props) {
  const [activeTab, setActiveTab] = useState<'skills' | 'mcp' | 'sandbox'>('skills')

  const border = '1px solid rgb(var(--c-border-subtle))'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="shrink-0 px-6 pt-5 pb-0">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-xl">⚡</span>
          <h1 className="text-[16px] font-semibold" style={{ color: 'rgb(var(--c-text-1))' }}>
            Extend Bobby
          </h1>
        </div>
        <p className="text-[12px] mb-4" style={{ color: 'rgb(var(--c-text-3))' }}>
          Teach Bobby new skills, connect external tools, and take him for a spin.
        </p>

        {/* Tabs */}
        <div className="flex items-center gap-0" style={{ borderBottom: border }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="relative flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium transition-all"
              style={{
                color: activeTab === tab.id ? 'rgb(217 119 87)' : 'rgb(var(--c-text-3))',
                boxShadow: activeTab === tab.id ? 'inset 0 -2px 0 rgb(217 119 87)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'skills'  && <SkillsPanel />}
        {activeTab === 'mcp'     && <MCPServersPanel />}
        {activeTab === 'sandbox' && <SandboxPanel leagueId={leagueId} />}
      </div>
    </div>
  )
}
