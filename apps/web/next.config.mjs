/** @type {import('next').NextConfig} */

function getAllowedOrigins() {
  const origins = new Set(['localhost:3000'])

  // NEXT_PUBLIC_APP_URL takes precedence (e.g. https://bobby.app)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) {
    try {
      const { hostname, port } = new URL(appUrl)
      origins.add(port ? `${hostname}:${port}` : hostname)
    } catch {
      // If it's already a bare host (no protocol), use as-is
      origins.add(appUrl.replace(/^https?:\/\//, '').split('/')[0])
    }
  }

  // VERCEL_URL is set automatically on Vercel deployments (no protocol prefix)
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) {
    origins.add(vercelUrl)
  }

  return [...origins]
}

const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'media.api-sports.io' },
      { protocol: 'https', hostname: 'flagcdn.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: getAllowedOrigins() },
  },
}

export default nextConfig
