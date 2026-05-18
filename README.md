# Real-Time Intelligence Co-pilot

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
