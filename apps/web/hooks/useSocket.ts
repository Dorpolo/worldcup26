'use client'

import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'

let sharedSocket: Socket | null = null
let refCount = 0

function getSocket(): Socket {
  if (!sharedSocket) {
    const url = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
    sharedSocket = io(url, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    })
  }
  return sharedSocket
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    socketRef.current = getSocket()
    refCount++

    return () => {
      refCount--
      // Don't disconnect the shared socket until all consumers unmount
      if (refCount === 0 && sharedSocket) {
        sharedSocket.disconnect()
        sharedSocket = null
      }
    }
  }, [])

  return socketRef
}
