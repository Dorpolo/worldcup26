import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/theme-provider'

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
  title: 'Polo Market',
  description: 'Polo Market — your World Cup 2026 predictions league.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(inter.variable, mono.variable)}>
      <body className={cn('font-sans antialiased', inter.className)}>
        <ThemeProvider>
          {children}
          <Toaster
            theme="system"
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'rgb(var(--surface-2))',
                border: '1px solid rgb(var(--border-subtle))',
                color: 'rgb(var(--text-1))',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
