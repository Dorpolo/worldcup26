import Redis from 'ioredis'
import type { Server as SocketIOServer } from 'socket.io'

let subscriber: Redis | null = null

export function setupRedisSubscriber(io: SocketIOServer) {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    console.warn('REDIS_URL not set — real-time updates disabled')
    return
  }

  subscriber = new Redis(redisUrl, {
    tls: redisUrl.startsWith('rediss://') ? {} : undefined,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  })

  subscriber.on('connect', () => console.log('✓ Redis subscriber connected'))
  subscriber.on('error', (err) => console.error('Redis subscriber error:', err))

  // Subscribe to all relevant channels using pattern
  subscriber.psubscribe('channel:*', (err) => {
    if (err) console.error('Redis psubscribe error:', err)
    else console.log('✓ Subscribed to channel:* pattern')
  })

  subscriber.on('pmessage', (_pattern, channel, message) => {
    try {
      const data = JSON.parse(message)

      // Leaderboard update → broadcast to league room
      if (channel.startsWith('channel:league:') && channel.endsWith(':leaderboard')) {
        const leagueId = channel.split(':')[2]
        io.to(`league:${leagueId}`).emit('leaderboard:update', data)
        return
      }

      // Live match score → broadcast to match room
      if (channel.startsWith('channel:match:') && channel.endsWith(':score')) {
        const matchId = channel.split(':')[2]
        io.to(`match:${matchId}`).emit('match:score', data)
        return
      }

      // Prediction locked → broadcast to match room
      if (channel.startsWith('channel:match:') && channel.endsWith(':lock')) {
        const matchId = channel.split(':')[2]
        io.to(`match:${matchId}`).emit('match:locked', data)
        return
      }
    } catch (err) {
      console.error('Failed to parse Redis message:', err)
    }
  })
}
