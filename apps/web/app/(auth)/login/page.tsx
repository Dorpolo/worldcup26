import { signIn } from '@/auth'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect('/leagues')

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'rgb(var(--c-bg))' }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgb(217 119 87 / 0.1) 0%, transparent 70%)' }}
      />

      <div className="relative w-full max-w-sm px-6 py-8 space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-glow-coral"
              style={{ background: 'linear-gradient(135deg, #d97757, #c8664a)' }}
            >
              ⚽
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'rgb(var(--c-text-1))' }}>
              Polo Market
            </h1>
            <p className="text-sm" style={{ color: 'rgb(var(--c-text-3))' }}>
              Predict. Compete. Win.
            </p>
          </div>
        </div>

        {/* Auth card */}
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{
            background: 'rgb(var(--c-surface))',
            border: '1px solid rgb(var(--c-border-normal))',
          }}
        >
          {/* Google */}
          <form
            action={async () => {
              'use server'
              await signIn('google', { redirectTo: '/leagues' })
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl font-medium text-sm transition-all duration-150"
              style={{
                background: 'rgb(var(--c-border-subtle))',
                border: '1px solid rgb(var(--c-border-normal))',
                color: 'rgb(var(--c-text-1))',
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgb(var(--c-border-normal))' }} />
            <span className="text-[11px]" style={{ color: 'rgb(var(--c-text-3))' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'rgb(var(--c-border-normal))' }} />
          </div>

          {/* Magic link */}
          <form
            action={async (formData: FormData) => {
              'use server'
              const email = formData.get('email') as string
              await signIn('resend', { email, redirectTo: '/leagues' })
            }}
            className="space-y-2.5"
          >
            <input
              name="email"
              type="email"
              placeholder="your@email.com"
              required
              className="w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none transition-all duration-150"
              style={{
                background: 'rgb(var(--c-overlay-md))',
                border: '1px solid rgb(var(--c-border-normal))',
                color: 'rgb(var(--c-text-1))',
              }}
            />
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-150"
              style={{
                background: 'rgb(217 119 87)',
                color: 'rgb(var(--c-bg))',
              }}
            >
              Send magic link
            </button>
          </form>
        </div>

        <p className="text-center text-[11px]" style={{ color: 'rgb(var(--c-surface-3))' }}>
          No password. Just a link in your inbox.
        </p>
      </div>
    </div>
  )
}
