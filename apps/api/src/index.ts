import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import { setupSocketHandlers } from './socket'
import { setupRedisSubscriber } from './redis/subscriber'
import { connectDB } from '@worldcup26/db'

const PORT = process.env.PORT ?? 4000
const CLIENT_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

async function main() {
  await connectDB()
  console.log('✓ MongoDB connected')

  const app = express()
  const httpServer = createServer(app)

  app.use(cors({ origin: CLIENT_URL, credentials: true }))
  app.use(express.json())

  // Health check
  app.get('/health', (_req, res) => res.json({ ok: true, service: 'worldcup26-api' }))

  // Socket.io
  const io = new SocketIOServer(httpServer, {
    cors: { origin: CLIENT_URL, methods: ['GET', 'POST'], credentials: true },
    transports: ['websocket', 'polling'],
  })

  setupSocketHandlers(io)
  setupRedisSubscriber(io)

  httpServer.listen(PORT, () => {
    console.log(`✓ Express + Socket.io running on port ${PORT}`)
  })
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
