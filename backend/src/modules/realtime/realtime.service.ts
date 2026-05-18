// Realtime Service

import { InteractionRepository, IInteractionRepository } from './interaction.repository';
import { AiService } from '../ai/ai.service';
import whisperClient from '../../infrastructure/whisper/WhisperClient';
import webSocketManager from '../../infrastructure/websocket/WebSocketManager';
import { FileProcessor } from '../../shared/utils/fileProcessor';
import { SOCKET_EVENTS, INTERACTION_TYPE } from '../../shared/constants';
import logger from '../../shared/logger';

export interface ProcessInputRequest {
  sessionId: string;
  userId: string;
  inputText?: string;
  audioPath?: string;
  type: 'text' | 'audio';
}

export class RealtimeService {
  private interactionRepository: IInteractionRepository;
  private aiService: AiService;

  constructor(
    interactionRepository: IInteractionRepository = new InteractionRepository(),
    aiService: AiService = new AiService()
  ) {
    this.interactionRepository = interactionRepository;
    this.aiService = aiService;
  }

  async processTextInput(request: ProcessInputRequest): Promise<void> {
    try {
      logger.info(`Processing text input for session: ${request.sessionId}`);

      const inputText = request.inputText || '';

      // Emit transcript chunk
      webSocketManager.emitToUser(request.userId, SOCKET_EVENTS.TRANSCRIPT_CHUNK, {
        text: inputText,
        timestamp: new Date(),
      });

      // Create interaction record
      const interaction = await this.interactionRepository.create({
        sessionId: request.sessionId,
        userId: request.userId,
        type: INTERACTION_TYPE.TEXT,
        inputText,
      });

      // Generate AI suggestion
      const aiResult = await this.aiService.generateSuggestion({
        userInput: inputText,
        userId: request.userId,
        useRag: true,
      });

      // Save AI suggestion
      await this.interactionRepository.createSuggestion({
        interactionId: interaction.id,
        content: aiResult.content,
        confidence: aiResult.confidence,
        model: aiResult.model,
        promptTokens: aiResult.promptTokens,
        completionTokens: aiResult.completionTokens,
        latencyMs: aiResult.latencyMs,
      });

      // Save RAG context
      if (aiResult.ragContext && aiResult.ragContext.length > 0) {
        for (const context of aiResult.ragContext) {
          await this.interactionRepository.createRagContext({
            interactionId: interaction.id,
            chunkContent: context.content,
            relevanceScore: context.score,
            documentId: context.metadata?.documentId,
          });
        }

        // Emit RAG context
        webSocketManager.emitToUser(request.userId, SOCKET_EVENTS.RAG_CONTEXT, {
          contexts: aiResult.ragContext,
        });
      }

      // Emit AI suggestion
      webSocketManager.emitToUser(request.userId, SOCKET_EVENTS.AI_SUGGESTION, {
        content: aiResult.content,
        confidence: aiResult.confidence,
        model: aiResult.model,
        latencyMs: aiResult.latencyMs,
        timestamp: new Date(),
      });

      // Emit interaction saved
      webSocketManager.emitToUser(request.userId, SOCKET_EVENTS.INTERACTION_SAVED, {
        interactionId: interaction.id,
      });

      logger.info(`Text input processed successfully: ${interaction.id}`);
    } catch (error) {
      logger.error('Text input processing error:', error);
      webSocketManager.emitToUser(request.userId, SOCKET_EVENTS.ERROR, {
        message: error instanceof Error ? error.message : 'Failed to process input',
      });
      throw error;
    }
  }

  async processAudioInput(request: ProcessInputRequest): Promise<void> {
    try {
      logger.info(`Processing audio input for session: ${request.sessionId}`);

      if (!request.audioPath) {
        throw new Error('Audio path is required');
      }

      // Transcribe audio
      const transcription = await whisperClient.transcribeAudio(request.audioPath);

      // Emit transcript chunk
      webSocketManager.emitToUser(request.userId, SOCKET_EVENTS.TRANSCRIPT_CHUNK, {
        text: transcription.text,
        timestamp: new Date(),
      });

      // Create interaction record
      const interaction = await this.interactionRepository.create({
        sessionId: request.sessionId,
        userId: request.userId,
        type: INTERACTION_TYPE.AUDIO,
        inputText: transcription.text,
        audioPath: request.audioPath,
      });

      // Generate AI suggestion
      const aiResult = await this.aiService.generateSuggestion({
        userInput: transcription.text,
        userId: request.userId,
        useRag: true,
      });

      // Save AI suggestion
      await this.interactionRepository.createSuggestion({
        interactionId: interaction.id,
        content: aiResult.content,
        confidence: aiResult.confidence,
        model: aiResult.model,
        promptTokens: aiResult.promptTokens,
        completionTokens: aiResult.completionTokens,
        latencyMs: aiResult.latencyMs,
      });

      // Save RAG context
      if (aiResult.ragContext && aiResult.ragContext.length > 0) {
        for (const context of aiResult.ragContext) {
          await this.interactionRepository.createRagContext({
            interactionId: interaction.id,
            chunkContent: context.content,
            relevanceScore: context.score,
            documentId: context.metadata?.documentId,
          });
        }

        webSocketManager.emitToUser(request.userId, SOCKET_EVENTS.RAG_CONTEXT, {
          contexts: aiResult.ragContext,
        });
      }

      // Emit AI suggestion
      webSocketManager.emitToUser(request.userId, SOCKET_EVENTS.AI_SUGGESTION, {
        content: aiResult.content,
        confidence: aiResult.confidence,
        model: aiResult.model,
        latencyMs: aiResult.latencyMs,
        timestamp: new Date(),
      });

      webSocketManager.emitToUser(request.userId, SOCKET_EVENTS.INTERACTION_SAVED, {
        interactionId: interaction.id,
      });

      logger.info(`Audio input processed successfully: ${interaction.id}`);
    } catch (error) {
      logger.error('Audio input processing error:', error);
      webSocketManager.emitToUser(request.userId, SOCKET_EVENTS.ERROR, {
        message: error instanceof Error ? error.message : 'Failed to process audio',
      });
      throw error;
    } finally {
      // Always clean up the uploaded audio file
      if (request.audioPath) {
        try {
          await FileProcessor.deleteFile(request.audioPath);
        } catch (cleanupError) {
          logger.warn('Failed to clean up audio file', { path: request.audioPath, cleanupError });
        }
      }
    }
  }

  async getInteractionHistory(sessionId: string, limit: number = 50) {
    return await this.interactionRepository.findBySessionId(sessionId, limit);
  }
}
