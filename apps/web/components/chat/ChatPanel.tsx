'use client'

import { useState } from 'react'
import { ChatWindow, type Message } from './ChatWindow'

interface Props {
  leagueId: string
  leagueName: string
  userName: string
  userRank: number
  userPoints: number
  initialMessages?: Message[]
}

export function ChatPanel(props: Props) {
  const [open, setOpen] = useState(true)

  return (
    <>
      {/* Collapsed toggle strip */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="shrink-0 flex flex-col items-center justify-center gap-3 w-10 transition-colors"
          style={{
            borderLeft: '1px solid rgb(255 255 255 / 0.07)',
            background: 'rgb(22 21 19)',
            color: 'rgb(107 100 92)',
          }}
          title="Open AI assistant"
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest rotate-[-90deg] whitespace-nowrap" style={{ color: 'rgb(217 119 87)' }}>
            AI
          </span>
          <span className="text-base">›</span>
        </button>
      )}

      {/* Open panel */}
      {open && (
        <div
          className="shrink-0 flex flex-col chat-panel-enter"
          style={{
            width: '360px',
            borderLeft: '1px solid rgb(255 255 255 / 0.07)',
            background: 'rgb(22 21 19)',
          }}
        >
          {/* Panel header */}
          <div
            className="shrink-0 flex items-center gap-2.5 px-4 py-3"
            style={{ borderBottom: '1px solid rgb(255 255 255 / 0.07)' }}
          >
            {/* Claude icon */}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
              style={{ background: 'linear-gradient(135deg, #d97757, #c8664a)' }}
            >
              C
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold" style={{ color: 'rgb(240 235 227)' }}>
                AI Assistant
              </p>
              <p className="text-[10px]" style={{ color: 'rgb(107 100 92)' }}>
                Claude · {props.leagueName}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-[18px] leading-none transition-colors px-1"
              style={{ color: 'rgb(107 100 92)' }}
              title="Collapse"
            >
              ›
            </button>
          </div>

          {/* Chat */}
          <div className="flex-1 overflow-hidden">
            <ChatWindow {...props} />
          </div>
        </div>
      )}
    </>
  )
}
