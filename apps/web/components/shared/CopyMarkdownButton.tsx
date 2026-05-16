'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface Props {
  /** The element ID to read content from. Defaults to reading the main content area. */
  targetId?: string
  /** Custom markdown string. If provided, skips DOM extraction. */
  markdown?: string
  label?: string
  className?: string
}

/**
 * Converts visible page content to Markdown and copies it to clipboard.
 * Useful for feeding page context into AI agents.
 */
export function CopyMarkdownButton({ targetId, markdown, label = 'Copy as Markdown', className }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      let text = markdown ?? ''

      if (!text) {
        const root = targetId
          ? document.getElementById(targetId)
          : document.querySelector('main') ?? document.body

        text = domToMarkdown(root as HTMLElement)
      }

      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Copied as Markdown — paste into any AI chat')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy page content as Markdown for AI consumption"
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80 ${className ?? ''}`}
      style={{
        background: copied ? 'rgb(63 185 80 / 0.12)' : 'rgb(var(--surface-2))',
        border: copied ? '1px solid rgb(63 185 80 / 0.3)' : '1px solid rgb(var(--border-subtle))',
        color: copied ? 'rgb(63 185 80)' : 'rgb(var(--text-3))',
      }}
    >
      {copied ? '✓' : '⬡'} {copied ? 'Copied!' : label}
    </button>
  )
}

// ── DOM → Markdown extractor ───────────────────────────────────────────
function domToMarkdown(el: HTMLElement): string {
  const lines: string[] = []
  walkNode(el, lines, 0)
  // Clean up: collapse many blank lines to two
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function walkNode(node: Node, lines: string[], depth: number): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (text) lines.push(text)
    return
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return
  const el = node as HTMLElement

  // Skip invisible, decorative, or non-content elements
  const tag = el.tagName.toLowerCase()
  const role = el.getAttribute('role')
  if (
    ['script', 'style', 'noscript', 'svg', 'button', 'input', 'textarea', 'select'].includes(tag) ||
    role === 'button' ||
    el.getAttribute('aria-hidden') === 'true' ||
    el.classList.contains('pointer-events-none')
  ) return

  // Block-level structural elements
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
    const level = parseInt(tag[1])
    const text = el.textContent?.trim()
    if (text) { lines.push(''); lines.push('#'.repeat(level) + ' ' + text); lines.push('') }
    return
  }

  if (tag === 'table') {
    lines.push('')
    lines.push(tableToMarkdown(el))
    lines.push('')
    return
  }

  if (tag === 'ul' || tag === 'ol') {
    lines.push('')
    el.querySelectorAll(':scope > li').forEach((li, i) => {
      const prefix = tag === 'ol' ? `${i + 1}.` : '-'
      lines.push(`${prefix} ${li.textContent?.replace(/\s+/g, ' ').trim() ?? ''}`)
    })
    lines.push('')
    return
  }

  if (tag === 'p') {
    const text = el.textContent?.replace(/\s+/g, ' ').trim()
    if (text) { lines.push(''); lines.push(text); lines.push('') }
    return
  }

  if (tag === 'hr') { lines.push(''); lines.push('---'); lines.push(''); return }
  if (tag === 'br') { lines.push(''); return }

  if (tag === 'code') {
    const text = el.textContent?.trim()
    if (text) lines.push('`' + text + '`')
    return
  }

  if (tag === 'pre') {
    const text = el.textContent?.trim()
    if (text) { lines.push(''); lines.push('```'); lines.push(text); lines.push('```'); lines.push('') }
    return
  }

  // Recurse into children
  el.childNodes.forEach((child) => walkNode(child, lines, depth + 1))
}

function tableToMarkdown(table: HTMLElement): string {
  const rows: string[][] = []
  table.querySelectorAll('tr').forEach((tr) => {
    const cells: string[] = []
    tr.querySelectorAll('th, td').forEach((td) => {
      cells.push(td.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    })
    if (cells.length > 0) rows.push(cells)
  })

  if (rows.length === 0) return ''
  const [header, ...body] = rows
  const sep = header.map(() => '---')
  const fmt = (row: string[]) => '| ' + row.join(' | ') + ' |'
  return [fmt(header), fmt(sep), ...body.map(fmt)].join('\n')
}
