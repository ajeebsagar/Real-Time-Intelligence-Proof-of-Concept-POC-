// WebSocket Service

import { io, Socket } from 'socket.io-client'

export enum SocketEvents {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  AUTHENTICATED = 'authenticated',
  LIVE_INPUT = 'live_input',
  TRANSCRIPT_CHUNK = 'transcript_chunk',
  RAG_CONTEXT = 'rag_context',
  AI_SUGGESTION = 'ai_suggestion',
  INTERACTION_SAVED = 'interaction_saved',
  ANALYTICS_UPDATED = 'analytics_updated',
  DOCUMENT_STATUS = 'document_status',
  ERROR = 'error',
}

class WebSocketService {
  private socket: Socket | null = null
  private listeners: Map<string, Set<Function>> = new Map()
  private currentUserId: string | null = null
  private currentSessionId: string | undefined = undefined
  private connectionListeners: Set<(connected: boolean) => void> = new Set()

  connect(userId: string, sessionId?: string): void {
    this.currentUserId = userId
    this.currentSessionId = sessionId

    if (this.socket) {
      // Already have a socket — just (re)authenticate with the new ids.
      if (this.socket.connected) {
        this.socket.emit('authenticate', { userId, sessionId })
      }
      return
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000'
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    this.socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      auth: token ? { token } : undefined,
    })

    this.socket.on(SocketEvents.CONNECT, () => {
      console.log('WebSocket connected')
      this.socket?.emit('authenticate', {
        userId: this.currentUserId,
        sessionId: this.currentSessionId,
      })
      this.notifyConnectionChange(true)
    })

    this.socket.on(SocketEvents.AUTHENTICATED, (data: any) => {
      console.log('WebSocket authenticated', data)
    })

    this.socket.on(SocketEvents.DISCONNECT, () => {
      console.log('WebSocket disconnected')
      this.notifyConnectionChange(false)
    })

    this.socket.on(SocketEvents.ERROR, (error: any) => {
      console.error('WebSocket error:', error)
    })

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    if (!this.socket) return

    const events = [
      SocketEvents.TRANSCRIPT_CHUNK,
      SocketEvents.RAG_CONTEXT,
      SocketEvents.AI_SUGGESTION,
      SocketEvents.INTERACTION_SAVED,
      SocketEvents.ANALYTICS_UPDATED,
      SocketEvents.DOCUMENT_STATUS,
    ]

    events.forEach((event) => {
      this.socket?.on(event, (data: any) => {
        this.notifyListeners(event, data)
      })
    })
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)?.add(callback)
  }

  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback)
  }

  private notifyListeners(event: string, data: any): void {
    this.listeners.get(event)?.forEach((callback) => {
      callback(data)
    })
  }

  emit(event: string, data: any): void {
    this.socket?.emit(event, data)
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.listeners.clear()
    this.currentUserId = null
    this.currentSessionId = undefined
    this.notifyConnectionChange(false)
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }

  onConnectionChange(cb: (connected: boolean) => void): () => void {
    this.connectionListeners.add(cb)
    cb(this.isConnected())
    return () => {
      this.connectionListeners.delete(cb)
    }
  }

  private notifyConnectionChange(connected: boolean): void {
    this.connectionListeners.forEach((cb) => cb(connected))
  }
}

export const wsService = new WebSocketService()
