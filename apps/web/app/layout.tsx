import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { Toaster } from 'sonner'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'WC2026 — Predictions',
  description: 'Compete with friends on World Cup 2026 match predictions, powered by AI',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn('dark', inter.variable, mono.variable)}
    >
      <body className={cn('font-sans antialiased', inter.className)}>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgb(46 43 40)',
              border: '1px solid rgb(255 255 255 / 0.1)',
              color: 'rgb(240 235 227)',
            },
          }}
        />
      </body>
    </html>
  )
}
