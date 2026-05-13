import { signIn } from '@/auth'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect('/leagues')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900">
      <div className="w-full max-w-md space-y-8 p-8">
        {/* Logo / Title */}
        <div className="text-center space-y-2">
          <div className="text-6xl">⚽</div>
          <h1 className="text-3xl font-bold text-white">World Cup 2026</h1>
          <p className="text-blue-200">Predictions with your friends</p>
        </div>

        {/* Auth card */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 space-y-4">
          {/* Google Sign-In */}
          <form
            action={async () => {
              'use server'
              await signIn('google', { redirectTo: '/leagues' })
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-medium py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/20" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 text-blue-200 bg-transparent">or</span>
            </div>
          </div>

          {/* Magic Link */}
          <form
            action={async (formData: FormData) => {
              'use server'
              const email = formData.get('email') as string
              await signIn('resend', { email, redirectTo: '/leagues' })
            }}
            className="space-y-3"
          >
            <input
              name="email"
              type="email"
              placeholder="your@email.com"
              required
              className="w-full bg-white/10 border border-white/20 text-white placeholder:text-blue-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-400 text-white font-medium py-3 px-4 rounded-xl transition-colors"
            >
              Send magic link
            </button>
          </form>
        </div>

        <p className="text-center text-blue-300 text-sm">
          No password needed. We&apos;ll email you a link to sign in.
        </p>
      </div>
    </div>
  )
}
