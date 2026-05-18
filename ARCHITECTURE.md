# Architecture Documentation

## Overview

This project implements a **Real-Time Intelligence Co-pilot** using enterprise-grade architecture patterns and SOLID principles.

## Architecture Layers

### 1. Presentation Layer (Frontend)
- **Technology**: Next.js 15 with App Router
- **State Management**: Zustand
- **UI Components**: shadcn/ui + Tailwind CSS
- **Real-time**: Socket.IO client

### 2. Application Layer (Backend)
- **Framework**: Express.js + TypeScript
- **Architecture**: Feature-based modular design
- **Patterns**: Repository, Service, Controller

### 3. Domain Layer
- **Business Logic**: Encapsulated in service classes
- **Entities**: Defined in Prisma schema
- **DTOs**: Type-safe data transfer objects

### 4. Infrastructure Layer
- **Database**: PostgreSQL + Prisma ORM
- **Vector Store**: FAISS for semantic search
- **External APIs**: OpenRouter, Whisper
- **Real-time**: Socket.IO server

## SOLID Principles Implementation

### Single Responsibility Principle (SRP)
Each class has one reason to change:
- `AuthService` - handles authentication only
- `SessionRepository` - database operations for sessions only
- `OpenRouterClient` - OpenRouter API communication only

### Open/Closed Principle (OCP)
Classes are open for extension, closed for modification:
- Repository interfaces allow different implementations
- Service layer can be extended without modifying existing code

### Liskov Substitution Principle (LSP)
Interfaces can be substituted with implementations:
- `IAuthRepository` can be replaced with any implementation
- `ISessionRepository` implementations are interchangeable

### Interface Segregation Principle (ISP)
Clients depend only on interfaces they use:
- Separate interfaces for each repository
- Focused service interfaces

### Dependency Inversion Principle (DIP)
High-level modules don't depend on low-level modules:
- Services depend on repository interfaces, not implementations
- Controllers depend on service interfaces
- Dependency injection throughout

## Module Structure

```
module/
├── module.controller.ts    # HTTP request handling
├── module.service.ts       # Business logic
├── module.repository.ts    # Data access
├── module.routes.ts        # Route definitions
└── module.types.ts         # Module-specific types
```

## Data Flow

1. **Request** → Controller
2. **Controller** → Service (business logic)
3. **Service** → Repository (data access)
4. **Repository** → Database
5. **Database** → Repository
6. **Repository** → Service
7. **Service** → Controller
8. **Controller** → Response

## Real-time Flow

1. **Client** → WebSocket connection
2. **WebSocket** → Realtime Service
3. **Realtime Service** → AI Service
4. **AI Service** → RAG Service
5. **RAG Service** → Vector Store
6. **Vector Store** → RAG Service
7. **RAG Service** → AI Service
8. **AI Service** → OpenRouter API
9. **OpenRouter** → AI Service
10. **AI Service** → Realtime Service
11. **Realtime Service** → WebSocket
12. **WebSocket** → Client

## RAG Pipeline

1. **Document Upload**
   - File validation
   - Text extraction (PDF, DOCX, TXT, MD)
   - Chunking (1000 chars, 200 overlap)

2. **Embedding Generation**
   - OpenAI embeddings via OpenRouter
   - Vector storage in FAISS

3. **Retrieval**
   - Query embedding
   - Similarity search (top-k)
   - Context ranking

4. **Generation**
   - Context injection into prompt
   - LLM completion via OpenRouter
   - Streaming response

## Security

- JWT authentication
- Password hashing (bcrypt)
- Input validation (Joi)
- CORS configuration
- Environment variable protection

## Scalability

- Stateless design
- Horizontal scaling ready
- Database connection pooling
- WebSocket room-based communication
- Async/await throughout

## Error Handling

- Centralized error middleware
- Custom AppError class
- Structured logging (Winston)
- Graceful degradation

## Testing Strategy

- Unit tests for services
- Integration tests for repositories
- E2E tests for API endpoints
- Component tests for frontend

## Deployment

- Docker containerization
- Docker Compose orchestration
- Environment-based configuration
- Health check endpoints
- Graceful shutdown handling

## Performance Optimizations

- Database indexing
- Vector store caching
- WebSocket connection pooling
- Lazy loading in frontend
- Code splitting in Next.js

## Monitoring & Observability

- Structured logging
- Request/response logging
- Error tracking
- Performance metrics
- WebSocket connection status

## Future Enhancements

1. Redis caching layer
2. Message queue (RabbitMQ/Kafka)
3. Microservices architecture
4. GraphQL API
5. Advanced analytics
6. Multi-tenancy support
7. Role-based access control
8. Audit logging
9. Rate limiting
10. API versioning
