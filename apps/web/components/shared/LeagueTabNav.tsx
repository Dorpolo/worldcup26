'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Tab { href: string; label: string; icon: string }

interface Props {
  base: string
  tabs: Tab[]
}

export function LeagueTabNav({ base, tabs }: Props) {
  const pathname = usePathname()

  return (
    <>
      {tabs.map((tab) => {
        const fullHref = `${base}${tab.href}`
        const isActive = tab.href === ''
          ? pathname === base || pathname === `${base}/`
          : pathname.startsWith(fullHref)

        return (
          <Link
            key={tab.href}
            href={fullHref}
            className="flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium border-b-2 whitespace-nowrap transition-all duration-150"
            style={{
              color: isActive ? 'rgb(var(--c-text-1))' : 'rgb(var(--c-text-3))',
              borderBottomColor: isActive ? 'rgb(217 119 87)' : 'transparent',
            }}
          >
            <span className="text-[10px] opacity-60">{tab.icon}</span>
            {tab.label}
          </Link>
        )
      })}
    </>
  )
}
