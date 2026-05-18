// Frontend Types

export interface User {
  id: string
  email: string
  name: string
  role: string
}

export interface Session {
  id: string
  userId: string
  title: string
  description?: string
  status: 'active' | 'paused' | 'completed'
  startedAt: string
  endedAt?: string
}

export interface Document {
  id: string
  userId: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  status: 'processing' | 'ready' | 'failed'
  uploadedAt: string
  processedAt?: string
}

export interface Interaction {
  id: string
  sessionId: string
  type: 'text' | 'audio'
  inputText: string
  timestamp: string
  suggestions: AiSuggestion[]
  contexts: RagContext[]
}

export interface AiSuggestion {
  id: string
  content: string
  confidence: number
  model: string
  createdAt: string
}

export interface RagContext {
  id: string
  chunkContent: string
  relevanceScore: number
  documentId?: string
}

export interface Analytics {
  sessionId?: string
  totalInteractions: number
  totalSuggestions: number
  avgConfidence: number
  avgLatencyMs: number
  documentsUsed: number
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
