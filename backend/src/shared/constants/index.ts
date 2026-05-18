// Application Constants

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const SESSION_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
} as const;

export const DOCUMENT_STATUS = {
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
} as const;

export const INTERACTION_TYPE = {
  TEXT: 'text',
  AUDIO: 'audio',
} as const;

export const USER_ROLE = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
] as const;

// Tuned for ingestion speed on local CPU embeddings.
// The model truncates at ~256 tokens (~1000 chars); we go bigger anyway because
// for POC RAG, fewer chunks (faster upload) is worth a small precision hit.
export const MAX_CHUNK_SIZE = 1800;
export const CHUNK_OVERLAP = 200;
export const TOP_K_RESULTS = 3;

export const AI_MODELS = {
  DEFAULT: 'openai/gpt-4o-mini',
  FAST: 'openai/gpt-3.5-turbo',
  EMBEDDING: 'text-embedding-3-small',
} as const;

export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  LIVE_INPUT: 'live_input',
  TRANSCRIPT_CHUNK: 'transcript_chunk',
  RAG_CONTEXT: 'rag_context',
  AI_SUGGESTION: 'ai_suggestion',
  INTERACTION_SAVED: 'interaction_saved',
  ANALYTICS_UPDATED: 'analytics_updated',
  DOCUMENT_STATUS: 'document_status',
  ERROR: 'error',
} as const;
