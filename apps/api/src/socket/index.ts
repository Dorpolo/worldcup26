import type { Server as SocketIOServer, Socket } from 'socket.io'

export function setupSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`)

    // Client joins a league room to receive leaderboard updates
    socket.on('join:league', (leagueId: string) => {
      socket.join(`league:${leagueId}`)
      console.log(`Socket ${socket.id} joined league:${leagueId}`)
    })

    // Client joins a match room to receive live score updates
    socket.on('join:match', (matchId: string) => {
      socket.join(`match:${matchId}`)
    })

    // Client leaves rooms
    socket.on('leave:league', (leagueId: string) => {
      socket.leave(`league:${leagueId}`)
    })

    socket.on('leave:match', (matchId: string) => {
      socket.leave(`match:${matchId}`)
    })

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`)
    })
  })
}
