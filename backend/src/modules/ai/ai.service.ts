// AI Service

import openRouterClient from '../../infrastructure/openrouter/OpenRouterClient';
import { RagService } from '../rag/rag.service';
import { AI_MODELS } from '../../shared/constants';
import logger from '../../shared/logger';

export interface AiGenerationRequest {
  userInput: string;
  userId?: string;
  sessionContext?: string;
  useRag?: boolean;
}

export interface AiGenerationResult {
  content: string;
  confidence: number;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs: number;
  ragContext?: any[];
}

export class AiService {
  private ragService: RagService;

  constructor(ragService: RagService = new RagService()) {
    this.ragService = ragService;
  }

  async generateSuggestion(request: AiGenerationRequest): Promise<AiGenerationResult> {
    const startTime = Date.now();

    try {
      logger.info('Generating AI suggestion');

      let ragContext: any[] = [];
      let contextText = '';

      // Retrieve RAG context if enabled (scoped to the requesting user)
      if (request.useRag !== false) {
        try {
          ragContext = await this.ragService.retrieveContext(request.userInput, {
            userId: request.userId,
          });
          contextText = this.ragService.formatContextForPrompt(ragContext);
        } catch (error) {
          logger.warn('RAG retrieval failed, continuing without context:', error);
        }
      }

      // Build prompt
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(
        request.userInput,
        contextText,
        request.sessionContext
      );

      // Generate completion
      const response = await openRouterClient.generateCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        AI_MODELS.DEFAULT,
        0.7,
        500
      );

      const latencyMs = Date.now() - startTime;

      const result: AiGenerationResult = {
        content: response.choices[0].message.content,
        confidence: this.calculateConfidence(response),
        model: response.model,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        latencyMs,
        ragContext: ragContext.length > 0 ? ragContext : undefined,
      };

      logger.info('AI suggestion generated', {
        latencyMs,
        tokens: response.usage?.total_tokens,
      });

      return result;
    } catch (error) {
      logger.error('AI generation error:', error);
      throw error;
    }
  }

  async generateStreamingSuggestion(
    request: AiGenerationRequest,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    try {
      let ragContext: any[] = [];
      let contextText = '';

      if (request.useRag !== false) {
        ragContext = await this.ragService.retrieveContext(request.userInput, {
          userId: request.userId,
        });
        contextText = this.ragService.formatContextForPrompt(ragContext);
      }

      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(
        request.userInput,
        contextText,
        request.sessionContext
      );

      await openRouterClient.generateStreamCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        AI_MODELS.DEFAULT,
        onChunk
      );
    } catch (error) {
      logger.error('AI streaming error:', error);
      throw error;
    }
  }

  private buildSystemPrompt(): string {
    return `You are an intelligent real-time consulting co-pilot assistant. Your role is to:

1. Provide concise, actionable insights during live client interactions
2. Reference relevant information from uploaded documents when available
3. Offer technically accurate guidance and recommendations
4. Highlight potential risks or issues proactively
5. Suggest appropriate responses or next steps

Guidelines:
- Be concise and direct (2-3 sentences max for most responses)
- Always cite document sources when referencing uploaded content
- Focus on practical, actionable advice
- Maintain a professional, consultative tone
- If uncertain, acknowledge limitations rather than speculating`;
  }

  private buildUserPrompt(
    userInput: string,
    contextText: string,
    sessionContext?: string
  ): string {
    let prompt = '';

    if (sessionContext) {
      prompt += `Session Context:\n${sessionContext}\n\n`;
    }

    if (contextText) {
      prompt += `Relevant Information from Documents:\n${contextText}\n\n`;
    }

    prompt += `Current Input:\n${userInput}\n\n`;
    prompt += `Provide a concise, actionable suggestion or insight based on the above information.`;

    return prompt;
  }

  private calculateConfidence(response: any): number {
    // Simple confidence calculation based on response characteristics
    // In production, this could be more sophisticated
    const hasContent = response.choices?.[0]?.message?.content?.length > 0;
    const finishReason = response.choices?.[0]?.finish_reason;

    if (!hasContent) return 0;
    if (finishReason === 'stop') return 0.9;
    if (finishReason === 'length') return 0.7;

    return 0.8;
  }
}
