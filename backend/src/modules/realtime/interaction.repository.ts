// Interaction Repository

import { prisma } from '../../shared/database';
import { Interaction, AiSuggestion, RagContext } from '@prisma/client';

export interface CreateInteractionData {
  sessionId: string;
  userId: string;
  type: string;
  inputText: string;
  audioPath?: string;
}

export interface CreateSuggestionData {
  interactionId: string;
  content: string;
  confidence: number;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
}

export interface CreateRagContextData {
  interactionId: string;
  chunkContent: string;
  relevanceScore: number;
  documentId?: string;
}

export interface IInteractionRepository {
  create(data: CreateInteractionData): Promise<Interaction>;
  findById(id: string): Promise<Interaction | null>;
  findBySessionId(sessionId: string, limit?: number): Promise<Interaction[]>;
  createSuggestion(data: CreateSuggestionData): Promise<AiSuggestion>;
  createRagContext(data: CreateRagContextData): Promise<RagContext>;
}

export class InteractionRepository implements IInteractionRepository {
  async create(data: CreateInteractionData): Promise<Interaction> {
    return await prisma.interaction.create({
      data,
    });
  }

  async findById(id: string): Promise<Interaction | null> {
    return await prisma.interaction.findUnique({
      where: { id },
      include: {
        suggestions: true,
        contexts: true,
      },
    });
  }

  async findBySessionId(sessionId: string, limit: number = 50): Promise<Interaction[]> {
    return await prisma.interaction.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        suggestions: true,
        contexts: true,
      },
    });
  }

  async createSuggestion(data: CreateSuggestionData): Promise<AiSuggestion> {
    return await prisma.aiSuggestion.create({
      data,
    });
  }

  async createRagContext(data: CreateRagContextData): Promise<RagContext> {
    return await prisma.ragContext.create({
      data,
    });
  }
}
