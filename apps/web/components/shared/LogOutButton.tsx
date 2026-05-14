'use client'

import { signOut } from 'next-auth/react'

export function LogOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="text-[11px] transition-colors px-1"
      style={{ color: 'rgb(107 100 92)' }}
      title="Sign out"
    >
      ↩
    </button>
  )
}
