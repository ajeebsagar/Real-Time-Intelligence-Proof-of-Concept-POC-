# Real-Time Intelligence Co-pilot
# Real-Time Intelligence Co-pilot — End-to-End Implementation Guide

> A working POC for a real-time AI consulting assistant. The system accepts text and audio input,
> retrieves context from user-uploaded PDFs/DOCX/MD via local RAG, and produces grounded AI
> suggestions over a WebSocket — all running locally on your machine.

---

## Table of Contents

1. [What it does](#what-it-does)
2. [Architecture](#architecture)
3. [Tech stack](#tech-stack)
4. [Repository layout](#repository-layout)
5. [Prerequisites](#prerequisites)
6. [Setup — Local PostgreSQL + npm](#setup--local-postgresql--npm)
7. [Setup — Docker Compose](#setup--docker-compose)
8. [Environment variables](#environment-variables)
9. [Subsystem-by-subsystem walkthrough](#subsystem-by-subsystem-walkthrough)
10. [API reference](#api-reference)
11. [WebSocket events](#websocket-events)
12. [Database schema](#database-schema)
13. [End-to-end user flow](#end-to-end-user-flow)
14. [Operational commands](#operational-commands)
15. [Troubleshooting](#troubleshooting)
16. [Known limitations](#known-limitations)

---

## What it does

| Capability | How |
|---|---|
| User accounts | Email + password, bcrypt-hashed, JWT sessions |
| Live sessions | Each "session" tracks one consultation; multiple interactions per session |
| Document ingestion | PDF / DOCX / TXT / MD → parsed → chunked → embedded → stored in FAISS |
| Text chat | User types → backend retrieves relevant PDF chunks → OpenRouter LLM responds → result pushed via WebSocket |
| Voice chat | Browser MediaRecorder → backend → Whisper (Docker) → transcript → same RAG/LLM flow |
| Real-time updates | Socket.IO pushes transcripts, AI suggestions, RAG context, and document-status changes |

---

## Architecture

```
┌──────────────────┐         HTTP / WS         ┌────────────────────────┐
│   Next.js 15     │ ────────────────────────► │   Node 20 + Express    │
│   (frontend)     │ ◄──────────────────────── │   (backend)            │
│                  │                            │                        │
│ • Zustand state  │                            │ • JWT auth             │
│ • socket.io      │                            │ • Multer file uploads  │
│ • MediaRecorder  │                            │ • Prisma ORM           │
└──────────────────┘                            │ • Socket.IO            │
                                                └─────┬──────────────────┘
                                                      │
                ┌─────────────────┬──────────────┬────┴──────────────┬────────────────┐
                ▼                 ▼              ▼                   ▼                ▼
        ┌─────────────┐    ┌───────────┐  ┌──────────────┐   ┌──────────────┐  ┌─────────────┐
        │ PostgreSQL  │    │  FAISS    │  │  Whisper     │   │  OpenRouter  │  │  @xenova/   │
        │ (Prisma)    │    │  on disk  │  │  ASR docker  │   │   (LLM)      │  │ transformers│
        │             │    │           │  │  (Python)    │   │              │  │  (CPU)      │
        └─────────────┘    └───────────┘  └──────────────┘   └──────────────┘  └─────────────┘
        Users, sessions,   Vector store    Speech → text       gpt-4o-mini      Local 384-dim
        docs, chunks,      (per-user)      English ASR          chat            embeddings
        interactions
```

**Data flow on text input:**
```
User types  ──► HTTP /api/input/text (returns 202 Accepted instantly)
                ▼
            backend (fire-and-forget)
                ▼
            embed query → FAISS top-K (filtered by userId)
                ▼
            build prompt → OpenRouter chat
                ▼
            WebSocket emits → transcript_chunk → rag_context → ai_suggestion → interaction_saved
                ▼
            Frontend Zustand updates → UI re-renders
```

**Data flow on audio input:**
```
User clicks mic ──► MediaRecorder captures webm/opus blob
                    ▼
                POST /api/input/audio (multipart, returns 202)
                    ▼
                multer writes to ./uploads/
                    ▼
                WhisperClient → POST http://whisper:9000/asr (Docker container)
                    ▼
                Transcript text → same flow as text input (RAG + LLM + WS emits)
                    ▼
                Audio file deleted from disk (finally block)
```

---

## Tech stack

### Backend (`/backend`)

| Concern | Library |
|---|---|
| Runtime | Node 20, TypeScript 5.3 |
| Web framework | Express 4 |
| Database | PostgreSQL 17 (local) or 15 (Docker), via Prisma 5 |
| Auth | jsonwebtoken, bcryptjs |
| File upload | multer |
| PDF extraction | **pdfjs-dist v4.10** (legacy build, dynamically imported) |
| DOCX extraction | mammoth |
| Vector store | FAISS via `@langchain/community/vectorstores/faiss` (faiss-node) |
| Embeddings | `@xenova/transformers` (local, Xenova/all-MiniLM-L6-v2, 384-dim) — OR OpenAI if `OPENAI_API_KEY` is set |
| LLM | OpenRouter (`openai/gpt-4o-mini`) |
| Speech-to-text | Whisper via `onerahmet/openai-whisper-asr-webservice` Docker container |
| Real-time | Socket.IO 4 |
| Logging | Winston |

### Frontend (`/frontend`)

| Concern | Library |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| State | Zustand |
| Styling | Tailwind CSS, shadcn/ui-style components |
| HTTP | Axios |
| Real-time | socket.io-client |
| Icons | lucide-react |

---

## Repository layout

```
Real-Time Intelligence POC/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma                     # PostgreSQL models
│   ├── src/
│   │   ├── app.ts                            # Express bootstrap + WS init
│   │   ├── infrastructure/
│   │   │   ├── openrouter/OpenRouterClient.ts
│   │   │   ├── vectorstore/VectorStoreManager.ts   # FAISS + embeddings
│   │   │   ├── websocket/WebSocketManager.ts       # Socket.IO server
│   │   │   └── whisper/WhisperClient.ts            # Whisper docker/openai client
│   │   ├── modules/
│   │   │   ├── ai/ai.service.ts              # LLM prompt assembly + call
│   │   │   ├── analytics/                    # Session/user/global stats
│   │   │   ├── auth/                         # /api/auth/register, /login
│   │   │   ├── documents/                    # Upload, chunk, embed, delete
│   │   │   ├── rag/rag.service.ts            # Similarity search wrapper
│   │   │   ├── realtime/                     # /api/input/text, /audio, /history
│   │   │   └── sessions/                     # /api/sessions
│   │   └── shared/
│   │       ├── constants/                    # HTTP_STATUS, SOCKET_EVENTS, etc.
│   │       ├── database/                     # Prisma singleton
│   │       ├── logger/                       # Winston instance
│   │       ├── middleware/                   # authenticate, asyncHandler, errorHandler
│   │       └── utils/fileProcessor.ts        # PDF/DOCX/TXT extraction + chunking
│   ├── uploads/                              # Multer disk storage
│   ├── vectorstore/                          # FAISS index files on disk
│   ├── Dockerfile                            # node:20-slim + openssl
│   └── package.json
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                          # Root → redirect to /login or /dashboard
│   │   ├── login/page.tsx
│   │   └── dashboard/page.tsx                # Main UI
│   ├── components/
│   │   ├── dashboard/{Header,InputPanel}.tsx
│   │   ├── transcript/TranscriptStream.tsx
│   │   ├── suggestions/{SuggestionsPanel,ContextPanel}.tsx
│   │   ├── uploads/DocumentUpload.tsx
│   │   └── shared/{Button,Card,Input,Badge}.tsx
│   ├── services/
│   │   ├── api.ts                            # Axios + token interceptor
│   │   └── websocket.ts                      # socket.io-client wrapper
│   ├── store/
│   │   ├── authStore.ts                      # zustand (NOT persisted — re-login each app start)
│   │   ├── sessionStore.ts
│   │   └── documentStore.ts
│   └── types/index.ts
│
├── docker-compose.yml                        # postgres + whisper + backend + frontend
├── .env                                       # Root env (Docker compose vars)
└── IMPLEMENTATION.md                          # This file
```

---

## Prerequisites

- **Node.js 20+** (`node -v` to check)
- **PostgreSQL 17** (for local-dev mode) OR **Docker Desktop** (for compose mode)
- **Docker Desktop** (always, for the Whisper container even in local-dev mode)
- **Windows / macOS / Linux** (tested on Windows 11)
- **OpenRouter API key** — sign up free at https://openrouter.ai/ (~$5 to use gpt-4o-mini meaningfully)
- **microphone permission in browser** (for voice input)

---

## Setup — Local PostgreSQL + npm

This is what we are running today. Backend and frontend run as `npm run dev` processes; Whisper runs in Docker.

### 1. Start PostgreSQL

```powershell
# Run once as Administrator:
Start-Service postgresql-x64-17
Set-Service postgresql-x64-17 -StartupType Automatic
```

### 2. Create the database (one-time)

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE realtime_intelligence;"
```

Enter your postgres user's password when prompted.

### 3. Start the Whisper container

```powershell
docker run -d --name whisper -p 9000:9000 `
  -v whisper_cache:/root/.cache `
  -e ASR_MODEL=small.en `
  --dns 8.8.8.8 --dns 1.1.1.1 `
  onerahmet/openai-whisper-asr-webservice:latest
```

First boot downloads the model (~500 MB for `small.en`) and takes 2-4 min — cached in the Docker volume after that.

To stop / start later: `docker stop whisper` / `docker start whisper`.

### 4. Configure backend `.env`

`backend/.env` must contain (URL-encode special chars in the password — `@` becomes `%40`):

```ini
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/realtime_intelligence?schema=public"

OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

JWT_SECRET=replace_with_a_long_random_string

MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

WHISPER_PROVIDER=docker
WHISPER_MODEL=small.en
WHISPER_API_URL=http://localhost:9000
WHISPER_LANGUAGE=en

VECTOR_STORE_PATH=./vectorstore
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2

LOG_LEVEL=info
```

### 5. Push the Prisma schema

```powershell
cd "d:\Real-Time Intelligence POC\backend"
npm install
npx prisma generate
npx prisma db push
```

`db push` creates all tables without requiring migration files (POC simplicity).

### 6. Start the backend

```powershell
cd "d:\Real-Time Intelligence POC\backend"
npm run dev
```

Wait for these lines:
```
Using local HuggingFace embeddings (Xenova/all-MiniLM-L6-v2)
Database connected
Loading existing FAISS vector store from disk
Embedding model pre-warmed in XXX ms
WebSocket server initialized
Server running on port 5000
```

### 7. Start the frontend (second terminal)

```powershell
cd "d:\Real-Time Intelligence POC\frontend"
npm install
npm run dev
```

Wait for `Ready in Xms`. Open http://localhost:3000.

---

## Setup — Docker Compose

For a fully containerized dev/demo environment.

```powershell
cd "d:\Real-Time Intelligence POC"

# Root .env must contain OPENROUTER_API_KEY and JWT_SECRET
# (it is gitignored — create it yourself)

docker compose up -d
```

This brings up:

| Container | Image | Host port |
|---|---|---|
| `realtime-intelligence-db` | postgres:15-alpine | **5433** (avoids conflict with local Postgres on 5432) |
| `realtime-intelligence-whisper` | onerahmet/openai-whisper-asr-webservice | 9000 |
| `realtime-intelligence-backend` | local build (node:20-slim) | 5000 |
| `realtime-intelligence-frontend` | local build (Next.js prod) | 3000 |

Inside the network, the backend reaches `postgres:5432` and `whisper:9000` by service name.

Stop: `docker compose down`. Wipe data: add `-v` to also remove volumes.

---

## Environment variables

| Var | Where | Purpose |
|---|---|---|
| `NODE_ENV` | backend | `development` / `production` |
| `PORT` | backend | HTTP+WS port (default 5000) |
| `FRONTEND_URL` | backend | CORS origin |
| `DATABASE_URL` | backend | Prisma connection string. Special chars in password must be URL-encoded |
| `JWT_SECRET` | backend | HMAC secret for JWTs. **Required.** |
| `OPENROUTER_API_KEY` | backend | LLM chat completions |
| `OPENROUTER_BASE_URL` | backend | `https://openrouter.ai/api/v1` |
| `WHISPER_PROVIDER` | backend | `docker` (default) or `openai` |
| `WHISPER_API_URL` | backend | `http://localhost:9000` for local Whisper container |
| `WHISPER_MODEL` | backend | Whisper model name (`tiny`, `base`, `small.en`, `medium.en`, …) |
| `WHISPER_LANGUAGE` | backend | ISO-639-1 lang code passed to `/asr` (default `en`) |
| `WHISPER_API_KEY` | backend | only for `openai` provider |
| `EMBEDDING_MODEL` | backend | Local HF model name (default `Xenova/all-MiniLM-L6-v2`) |
| `OPENAI_API_KEY` | backend (optional) | If set, embeddings use OpenAI's API (~10× faster than local) |
| `OPENAI_EMBEDDING_MODEL` | backend (optional) | Default `text-embedding-3-small` (1536-dim) |
| `VECTOR_STORE_PATH` | backend | Directory for FAISS index files |
| `MAX_FILE_SIZE` | backend | Max upload size in bytes (default 10 MB) |
| `UPLOAD_DIR` | backend | Where multer writes uploads |
| `LOG_LEVEL` | backend | `info` / `debug` / `warn` |
| `NEXT_PUBLIC_API_URL` | frontend | Backend base URL (default `http://localhost:5000`) |
| `NEXT_PUBLIC_WS_URL` | frontend | WebSocket URL (default same as API URL) |

---

## Subsystem-by-subsystem walkthrough

### 1. Auth (`backend/src/modules/auth/`)

- `POST /api/auth/register` → `{ success, data: { token, user } }`
- `POST /api/auth/login` → same shape
- Passwords hashed with bcrypt (cost 10)
- JWT payload: `{ id, email, role, iat, exp }` (7-day expiry)
- The `authenticate` middleware reads `Authorization: Bearer <token>`, attaches `req.user`

Frontend stores the token in `localStorage` (`token` key). On every request, axios attaches it via interceptor.

### 2. Sessions (`backend/src/modules/sessions/`)

- `POST /api/sessions` `{ title, description? }` → creates a new session
- `GET /api/sessions` → list user's sessions
- `GET /api/sessions/:id` → one session with interactions
- `PATCH /api/sessions/:id/status` `{ status: 'active'|'paused'|'completed' }`
- `DELETE /api/sessions/:id`

A session groups interactions (questions / answers / transcripts) so they share context in the UI.

### 3. Documents (`backend/src/modules/documents/`)

**Upload flow:**

```
POST /api/documents (multipart, field="file")
   ↓
multer writes to ./uploads/<unique>.pdf
   ↓
DocumentService.uploadDocument
   ↓
   • INSERT into documents (status=processing)
   • emit WS document_status { processing }
   • return 201 to client
   ↓
processDocument() runs in background:
   • FileProcessor.extractText(path, mime)
        - PDF → pdfjs-dist v4 (page-by-page getTextContent)
        - DOCX → mammoth.extractRawText
        - TXT/MD → fs.readFileSync
   • FileProcessor.chunkText(text, 1800, 200)  ← character window with overlap
   • DocumentRepository.createChunks(...)  ← single batched INSERT
   • VectorStoreManager.addDocuments(...)  ← embeds chunks + appends to FAISS
   • UPDATE documents SET status='ready'
   • emit WS document_status { ready, chunks: N }
```

Frontend listens for `document_status` and live-updates the green check / red error in the Documents panel.

Timing example (1-chunk PDF, after model pre-warmed):
```
extract: 354ms, db-insert: 4ms, embed: 38ms → total 401ms
```

### 4. Vector store (`backend/src/infrastructure/vectorstore/VectorStoreManager.ts`)

- Single FAISS index file shared across all users (persisted to `./vectorstore/`)
- Each chunk carries metadata `{ documentId, userId, chunkIndex, chunkId }`
- **Per-user isolation in retrieval**: similarity search over-scans (`k × 4`) then filters by `metadata.userId === currentUserId`
- **Deletion**: FAISS doesn't support per-vector delete, so `deleteDocumentChunks(id)` calls `rebuildFromDatabase()` — re-reads all surviving chunks from Postgres and rebuilds the index. Cheap with local CPU embeddings.
- **Embedding provider**: picks OpenAI if `OPENAI_API_KEY` is set, else local Xenova (CPU, free)
- **Pre-warm**: at startup, runs one `embedQuery('warmup')` so the first user request is fast
- **Score**: FAISS returns L2 distance; converted to similarity in (0, 1] via `1 / (1 + distance)`

### 5. RAG (`backend/src/modules/rag/rag.service.ts`)

```ts
retrieveContext(query, { userId, topK = 3 })
   ↓
vectorStoreManager.similaritySearch(query, k, { userId })
   ↓
Returns Array<{ content, metadata, score }>
   ↓
formatContextForPrompt(results) → flat string with [Context 1] (Relevance: 78%) ... blocks
```

### 6. AI service (`backend/src/modules/ai/ai.service.ts`)

```ts
generateSuggestion({ userInput, userId, useRag })
   ↓
if useRag: ragContext = ragService.retrieveContext(userInput, { userId })
   ↓
build system prompt + user prompt with embedded context
   ↓
openRouterClient.generateCompletion([system, user], "openai/gpt-4o-mini", 0.7, 500)
   ↓
return { content, confidence, model, promptTokens, completionTokens, latencyMs, ragContext }
```

### 7. Whisper client (`backend/src/infrastructure/whisper/WhisperClient.ts`)

Supports two providers, switched by `WHISPER_PROVIDER`:

| Provider | Endpoint | Form field | Auth header |
|---|---|---|---|
| `docker` (default) | `POST /asr?task=transcribe&output=json&language=en` | `audio_file` | — |
| `openai` | `POST /v1/audio/transcriptions` | `file` + `model=whisper-1` + `response_format=json` | `Authorization: Bearer <WHISPER_API_KEY>` |

On `ECONNREFUSED`, the client throws an explicit error (no silent placeholder).

### 8. Realtime processing (`backend/src/modules/realtime/`)

```
POST /api/input/text   { sessionId, inputText }   ← Joi-validated
POST /api/input/audio  multipart "audio" field    ← multer-wrapped + MulterError→400
   ↓
Controller returns 202 immediately ("Input processing started")
   ↓
Service runs fire-and-forget (`void ... .catch(logger.error)`):
   • TEXT: emit transcript_chunk(inputText) → save Interaction → AI → save AiSuggestion → save RagContext × n → emit ai_suggestion / rag_context / interaction_saved
   • AUDIO: WhisperClient.transcribeAudio(path) → finally{deleteFile(path)} → same flow as text
```

The HTTP request returns instantly with 202; all results stream over WebSocket.

### 9. WebSocket (`backend/src/infrastructure/websocket/WebSocketManager.ts`)

- Socket.IO server attached to the HTTP server
- Client emits `authenticate { userId, sessionId }` (note: trust-based today — a known security limitation)
- Server tracks `Map<userId, Socket>` and `emitToUser(userId, event, data)` for direct push

---

## API reference

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| GET | `/health` | — | — | `{status:"ok"}` |
| POST | `/api/auth/register` | — | `{email, password, name}` | Returns `{token, user}` |
| POST | `/api/auth/login` | — | `{email, password}` | Returns `{token, user}` |
| POST | `/api/sessions` | ✓ | `{title, description?}` | Create session |
| GET | `/api/sessions` | ✓ | — | List sessions |
| GET | `/api/sessions/:id` | ✓ | — | Session details |
| PATCH | `/api/sessions/:id/status` | ✓ | `{status}` | Update status |
| DELETE | `/api/sessions/:id` | ✓ | — | Delete session |
| POST | `/api/documents` | ✓ | multipart `file` | Upload doc (returns 201 with doc row; processing happens async) |
| GET | `/api/documents` | ✓ | — | List user's docs |
| GET | `/api/documents/:id` | ✓ | — | Doc details + chunks |
| DELETE | `/api/documents/:id` | ✓ | — | Delete doc + rebuild FAISS |
| POST | `/api/input/text` | ✓ | `{sessionId, inputText}` | Returns 202; results via WS |
| POST | `/api/input/audio` | ✓ | multipart `audio` + `sessionId` | Returns 202; results via WS |
| GET | `/api/input/history/:sessionId` | ✓ | — | Recent interactions |
| GET | `/api/analytics/session/:sessionId` | ✓ | — | Stats for one session |
| GET | `/api/analytics/user` | ✓ | — | Stats for current user |
| GET | `/api/analytics/global` | ✓ | — | Global stats (no admin gate yet) |

Auth column: ✓ = requires `Authorization: Bearer <token>` header.

---

## WebSocket events

Connect to `ws://localhost:5000`, then immediately emit `authenticate { userId, sessionId? }`.

**Server → client:**

| Event | Payload | When |
|---|---|---|
| `authenticated` | `{}` | After server processes `authenticate` |
| `transcript_chunk` | `{text, timestamp}` | After audio is transcribed or text is received |
| `rag_context` | `{contexts: [{content, metadata, score}]}` | After RAG retrieval |
| `ai_suggestion` | `{content, confidence, model, latencyMs, timestamp}` | After LLM completes |
| `interaction_saved` | `{interactionId}` | After DB persistence |
| `document_status` | `{documentId, status, chunks?, error?}` | When a doc transitions `processing`/`ready`/`failed` |
| `error` | `{message}` | On any processing failure |

**Client → server:**

| Event | Payload |
|---|---|
| `authenticate` | `{userId, sessionId?}` |

---

## Database schema

PostgreSQL via Prisma. Tables:

```
users
 ├── sessions (1-N)
 ├── documents (1-N)  ── chunks (1-N)
 └── interactions (1-N)
                      ├── suggestions (1-N) (ai_suggestions)
                      └── contexts (1-N)    (rag_contexts)
```

Key columns:

- **users**: `id, email, password, name, role`
- **sessions**: `id, userId, title, status, startedAt, endedAt`
- **documents**: `id, userId, filename, originalName, mimeType, size, path, status, uploadedAt, processedAt`
- **document_chunks**: `id, documentId, content, embedding (unused), metadata (JSON), chunkIndex`
- **interactions**: `id, sessionId, userId, type (text|audio), inputText, audioPath, timestamp`
- **ai_suggestions**: `id, interactionId, content, confidence, model, promptTokens, completionTokens, latencyMs`
- **rag_contexts**: `id, interactionId, documentId, chunkContent, relevanceScore`

All FKs cascade-delete (deleting a user wipes their sessions, docs, chunks, interactions).

---

## End-to-end user flow

1. **Open** http://localhost:3000
2. **Sign up** with email/password (or log in if you already registered)
3. **Click "Start New Session"** — gives you a session ID
4. **Upload a PDF** in the Documents panel (right column). Wait for the green ✓
5. **Type a question** in the input box (bottom-left), e.g. *"Summarize this document"*
6. **Click Send** — within ~3-8 seconds you see:
   - Your question in **Live Transcript** (left)
   - The AI answer in **AI Suggestions** (middle)
   - The matching PDF chunks in **Retrieved Context** (top right)
7. **Or record audio** — click the mic icon, grant permission, speak, click stop. Whisper transcribes, then RAG/LLM as before.

---

## Operational commands

```powershell
# --- Health checks
curl http://localhost:5000/health
curl http://localhost:9000/docs

# --- Database
cd backend
npx prisma studio                                 # GUI for DB inspection (port 5555)
npx prisma db push                                # Re-sync schema
npx prisma db push --force-reset                  # WIPE DATABASE

# --- Vector store
Remove-Item -Recurse -Force backend\vectorstore\* # Clear FAISS index

# --- Whisper container
docker logs whisper --tail=50
docker restart whisper
docker rm -f whisper                              # Delete the container
# Recreate with a different model:
docker run -d --name whisper -p 9000:9000 -v whisper_cache:/root/.cache `
  -e ASR_MODEL=medium.en --dns 8.8.8.8 onerahmet/openai-whisper-asr-webservice:latest

# --- Inspect specific tables
$env:PGPASSWORD = "YOUR_PG_PASSWORD"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d realtime_intelligence -c "SELECT id, status, originalName FROM documents ORDER BY uploadedAt DESC;"

# --- Clean up failed documents
$env:PGPASSWORD = "YOUR_PG_PASSWORD"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d realtime_intelligence -c "DELETE FROM document_chunks WHERE \"documentId\" IN (SELECT id FROM documents WHERE status = 'failed'); DELETE FROM documents WHERE status = 'failed';"

# --- Tail logs (Docker mode)
docker compose logs -f backend
docker compose logs -f frontend
```

---

## Troubleshooting

### "Network Error" on login

- Backend isn't running. Check `curl http://localhost:5000/health`. Restart backend with `npm run dev`.
- Wrong API URL: confirm `NEXT_PUBLIC_API_URL` matches the backend host/port.

### "Invalid credentials" after re-creating the database

The user record was wiped. Click **Sign up** to recreate the account.

### `prisma db push` says "password authentication failed"

The password in `DATABASE_URL` doesn't match Postgres. Update `backend/.env`. Remember to URL-encode special characters (e.g. `@` → `%40`).

### Port 5000 / 3000 / 9000 / 5432 already in use

Find the conflicting process:
```powershell
Get-NetTCPConnection -LocalPort 5000 | ForEach-Object { Get-Process -Id $_.OwningProcess }
```
Stop it (`Stop-Process -Id <pid>`).

### `Setting up fake worker failed` (PDF)

Solved in the current code: pdfjs-dist v4 worker is set via `pathToFileURL(workerPath).href` — Windows paths get the proper `file://` URL scheme.

### "Vectors must have the same length as the number of dimensions (X)"

The FAISS index on disk was built with a different embedding model (different dim). Either:
- Delete `backend/vectorstore/*` and re-upload all docs, or
- Switch back to the original embedding model.

### Whisper container fails with `urlopen error [Errno -3]`

Docker DNS issue. Recreate with explicit DNS:
```powershell
docker rm -f whisper
docker run -d --name whisper -p 9000:9000 -v whisper_cache:/root/.cache `
  -e ASR_MODEL=small.en --dns 8.8.8.8 --dns 1.1.1.1 onerahmet/openai-whisper-asr-webservice:latest
```

### Microphone "Permission denied"

Click the address-bar padlock → allow Microphone → reload. Or visit `chrome://settings/content/microphone` and remove the block for `http://localhost:3000`.

### Audio transcription is gibberish

Switch Whisper to a larger model:
```powershell
docker rm -f whisper
docker run -d --name whisper -p 9000:9000 -v whisper_cache:/root/.cache `
  -e ASR_MODEL=small.en --dns 8.8.8.8 onerahmet/openai-whisper-asr-webservice:latest
```
Model accuracy: `tiny` < `base` < `small` < `medium` < `large`. `.en` variants are English-only and slightly better for English audio.

### PDF upload is slow

- First upload after backend restart loads the embedding model (~15-30s). Subsequent ones use the cached model.
- For large PDFs, use OpenAI embeddings: set `OPENAI_API_KEY` in `backend/.env` and restart. Then wipe `vectorstore/` because the dim changes (384 → 1536).

---

## Known limitations

These are deliberate POC shortcuts, **not** code defects to chase:

| Area | Limitation |
|---|---|
| Security | WebSocket `authenticate` trusts client-supplied `userId` (no JWT verification on the socket) |
| Security | No per-row ownership checks on `/api/sessions/:id`, `/api/documents/:id`, `/api/input/history/:id` — any authenticated user can read another's data by ID |
| Security | `/api/analytics/global` isn't admin-gated |
| Security | `JWT_SECRET` has a hard-coded fallback in `auth.service.ts` / `auth.ts` middleware if env is missing |
| AI quality | Confidence scores are heuristic-only (0.9 / 0.7 / 0.8 based on `finish_reason`) — not real model logprobs |
| WebSocket | Single-socket-per-user (`Map<userId, Socket>`); a second tab evicts the first |
| Streaming | OpenRouter streaming is implemented but not wired to the UI — all suggestions land in one shot |
| Rate limiting | None — login brute-force and AI-cost abuse are possible |
| HTTPS | The app runs over HTTP locally; no certificate management |

If you want to harden any of these for production, the audit & fix path is documented in the codebase's git history.

---

**That's the entire system.** If anything in this document drifts from the code, the code wins — open the file referenced in each section and trust what's there.










An enterprise-grade AI-powered real-time consulting assistant that provides contextual insights during live client interactions using RAG (Retrieval-Augmented Generation) and real-time communication.

## 🚀 Features

- **Real-Time AI Suggestions**: Get instant AI-powered insights during consultations
- **RAG Pipeline**: Semantic search across uploaded documents for contextual responses
- **Speech-to-Text**: Audio transcription using Whisper
- **WebSocket Communication**: Live bidirectional updates
- **Document Management**: Upload and process PDFs, DOCX, TXT, and Markdown files
- **Analytics Dashboard**: Track interactions, confidence scores, and performance metrics
- **Modern UI**: Beautiful glassmorphism design with dark mode support
- **Enterprise Architecture**: SOLID principles, clean architecture, modular design

## 🏗️ Architecture

### Backend
- **Framework**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Vector Store**: FAISS for semantic search
- **AI**: OpenRouter API for LLM completions
- **Real-time**: Socket.IO for WebSocket communication
- **Speech**: Whisper for audio transcription

### Frontend
- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand
- **Real-time**: Socket.IO client

## 📋 Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Python 3.10+ (for virtual environment)
- OpenRouter API key
- (Optional) Docker & Docker Compose

## 🛠️ Installation

### Option 1: Local Development

#### 1. Clone and Setup

```bash
cd "d:\Real-Time Intelligence POC"
```

#### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
copy .env.example .env

# Edit .env and add your OpenRouter API key
# DATABASE_URL=postgresql://postgres:password@localhost:5432/realtime_intelligence
# OPENROUTER_API_KEY=your_key_here

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev
```

Backend will run on `http://localhost:5000`

#### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Copy environment file
copy .env.example .env

# Start development server
npm run dev
```

Frontend will run on `http://localhost:3000`

### Option 2: Docker Deployment

```bash
# Create .env file in root directory
echo OPENROUTER_API_KEY=your_key_here > .env
echo JWT_SECRET=your_secret_key >> .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📁 Project Structure

```
Real-Time Intelligence POC/
├── backend/
│   ├── src/
│   │   ├── modules/          # Feature modules
│   │   │   ├── auth/         # Authentication
│   │   │   ├── sessions/     # Session management
│   │   │   ├── documents/    # Document handling
│   │   │   ├── rag/          # RAG pipeline
│   │   │   ├── ai/           # AI service
│   │   │   ├── realtime/     # WebSocket handlers
│   │   │   └── analytics/    # Analytics
│   │   ├── infrastructure/   # External services
│   │   │   ├── websocket/    # WebSocket manager
│   │   │   ├── vectorstore/  # Vector database
│   │   │   ├── openrouter/   # OpenRouter client
│   │   │   └── whisper/      # Whisper client
│   │   ├── shared/           # Shared utilities
│   │   │   ├── database/     # Prisma client
│   │   │   ├── logger/       # Winston logger
│   │   │   ├── middleware/   # Express middleware
│   │   │   ├── types/        # TypeScript types
│   │   │   ├── utils/        # Utility functions
│   │   │   └── constants/    # Constants
│   │   └── app.ts            # Application entry
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── app/                  # Next.js pages
│   │   ├── login/            # Login page
│   │   ├── dashboard/        # Main dashboard
│   │   └── layout.tsx        # Root layout
│   ├── components/           # React components
│   │   ├── dashboard/        # Dashboard components
│   │   ├── transcript/       # Transcript stream
│   │   ├── suggestions/      # AI suggestions
│   │   ├── uploads/          # Document upload
│   │   └── shared/           # Shared UI components
│   ├── services/             # API & WebSocket services
│   ├── store/                # Zustand stores
│   ├── types/                # TypeScript types
│   ├── lib/                  # Utilities
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml
└── README.md
```

## 🔑 Environment Variables

### Backend (.env)

```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

DATABASE_URL=postgresql://postgres:password@localhost:5432/realtime_intelligence?schema=public

OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

JWT_SECRET=your_super_secret_jwt_key

MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

WHISPER_MODEL=base
WHISPER_API_URL=http://localhost:9000

VECTOR_STORE_PATH=./vectorstore
EMBEDDING_MODEL=text-embedding-3-small

LOG_LEVEL=info
```

### Frontend (.env)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=http://localhost:5000
```

## 🎯 Usage

### 1. Register/Login
- Navigate to `http://localhost:3000`
- Create an account or login

### 2. Start a Session
- Click "Start New Session" on the dashboard
- Give your session a title

### 3. Upload Documents
- Upload PDFs, DOCX, TXT, or Markdown files
- Documents are automatically processed and indexed

### 4. Interact
- Type messages or record audio
- Receive real-time AI suggestions based on your input and uploaded documents
- View retrieved context from your documents

### 5. Monitor
- Track confidence scores
- View interaction history
- Access analytics

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions` - Get user sessions
- `GET /api/sessions/:id` - Get session details
- `PATCH /api/sessions/:id/status` - Update session status
- `DELETE /api/sessions/:id` - Delete session

### Documents
- `POST /api/documents` - Upload document
- `GET /api/documents` - Get user documents
- `GET /api/documents/:id` - Get document details
- `DELETE /api/documents/:id` - Delete document

### Real-time Input
- `POST /api/input/text` - Send text input
- `POST /api/input/audio` - Send audio input
- `GET /api/input/history/:sessionId` - Get interaction history

### Analytics
- `GET /api/analytics/session/:sessionId` - Session analytics
- `GET /api/analytics/user` - User analytics
- `GET /api/analytics/global` - Global analytics

## 🔌 WebSocket Events

### Client → Server
- `authenticate` - Authenticate WebSocket connection
- `live_input` - Send live input

### Server → Client
- `authenticated` - Authentication confirmation
- `transcript_chunk` - Transcribed text chunk
- `rag_context` - Retrieved document context
- `ai_suggestion` - AI-generated suggestion
- `interaction_saved` - Interaction saved confirmation
- `analytics_updated` - Analytics update
- `error` - Error notification

## 🏛️ Design Principles

This project strictly follows:

- **SOLID Principles**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **Clean Architecture**: Separation of concerns, dependency injection, repository pattern
- **Modular Design**: Feature-based modules, reusable components
- **Type Safety**: Full TypeScript coverage
- **Scalability**: Horizontal scaling ready, stateless design

## 🤝 Contributing

This is a POC project. For production use, consider:

- Adding comprehensive test coverage
- Implementing rate limiting
- Adding request validation
- Setting up monitoring (Prometheus, Grafana)
- Implementing caching (Redis)
- Adding CI/CD pipelines
- Enhancing security measures

## 📝 License

MIT License

## 🙏 Acknowledgments

- OpenRouter for LLM API
- OpenAI for Whisper
- Vercel for Next.js
- Prisma for database ORM
- shadcn/ui for UI components

---

**Built with ❤️ for enterprise-grade AI applications**
