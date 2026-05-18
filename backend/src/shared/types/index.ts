// Shared Types and Interfaces

export interface IUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface ISession {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: 'active' | 'paused' | 'completed';
  startedAt: Date;
  endedAt?: Date;
}

export interface IDocument {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  status: 'processing' | 'ready' | 'failed';
  uploadedAt: Date;
  processedAt?: Date;
}

export interface IInteraction {
  id: string;
  sessionId: string;
  userId: string;
  type: 'text' | 'audio';
  inputText: string;
  audioPath?: string;
  timestamp: Date;
}

export interface IAiSuggestion {
  id: string;
  interactionId: string;
  content: string;
  confidence: number;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
}

export interface IRagContext {
  id: string;
  interactionId: string;
  documentId?: string;
  chunkContent: string;
  relevanceScore: number;
}

export interface IAnalytics {
  id: string;
  sessionId: string;
  totalInteractions: number;
  totalSuggestions: number;
  avgConfidence?: number;
  avgLatencyMs?: number;
  documentsUsed: number;
  timestamp: Date;
}

// DTOs
export interface CreateSessionDTO {
  userId: string;
  title: string;
  description?: string;
}

export interface CreateInteractionDTO {
  sessionId: string;
  userId: string;
  type: 'text' | 'audio';
  inputText: string;
  audioPath?: string;
}

export interface UploadDocumentDTO {
  userId: string;
  file: Express.Multer.File;
}

export interface ProcessInputDTO {
  sessionId: string;
  userId: string;
  inputText: string;
  type: 'text' | 'audio';
}

// WebSocket Events
export enum SocketEvents {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  LIVE_INPUT = 'live_input',
  TRANSCRIPT_CHUNK = 'transcript_chunk',
  RAG_CONTEXT = 'rag_context',
  AI_SUGGESTION = 'ai_suggestion',
  INTERACTION_SAVED = 'interaction_saved',
  ANALYTICS_UPDATED = 'analytics_updated',
  ERROR = 'error',
}

// Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
