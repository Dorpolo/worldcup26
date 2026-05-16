'use client'

import { signOut } from 'next-auth/react'

export function LogOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="text-[11px] transition-colors px-1"
      style={{ color: 'rgb(var(--c-text-3))' }}
      title="Sign out"
    >
      ↩
    </button>
  )
}
