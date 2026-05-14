'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ChatWindow, type Message } from './ChatWindow'

interface Props {
  leagueId: string
  leagueName: string
  userName: string
  userRank: number
  userPoints: number
  initialMessages?: Message[]
}

const MIN_WIDTH = 280
const MAX_WIDTH = 720
const DEFAULT_WIDTH = 420

export function ChatPanel(props: Props) {
  const [open, setOpen] = useState(true)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    startX.current = e.clientX
    startWidth.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [width])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return
      const delta = startX.current - e.clientX
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta))
      setWidth(next)
    }
    function onMouseUp() {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

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
          className="shrink-0 flex chat-panel-enter"
          style={{
            width: `${width}px`,
            borderLeft: '1px solid rgb(255 255 255 / 0.07)',
            background: 'rgb(22 21 19)',
            position: 'relative',
          }}
        >
          {/* Drag handle — left edge */}
          <div
            onMouseDown={onMouseDown}
            className="absolute left-0 top-0 bottom-0 w-1 z-10 group"
            style={{ cursor: 'col-resize' }}
            title="Drag to resize"
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgb(217 119 87 / 0.35)' }}
            />
          </div>

          <div className="flex flex-col flex-1 min-w-0">
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
        </div>
      )}
    </>
  )
}
