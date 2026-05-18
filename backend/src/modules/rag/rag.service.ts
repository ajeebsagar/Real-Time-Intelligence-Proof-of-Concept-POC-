// RAG Service

import vectorStoreManager, {
  SimilarityResult,
} from '../../infrastructure/vectorstore/VectorStoreManager';
import { TOP_K_RESULTS } from '../../shared/constants';
import logger from '../../shared/logger';

export type RagResult = SimilarityResult;

export interface RagRetrievalOptions {
  topK?: number;
  userId?: string;
  documentId?: string;
}

export class RagService {
  async retrieveContext(
    query: string,
    options: RagRetrievalOptions = {}
  ): Promise<RagResult[]> {
    const { topK = TOP_K_RESULTS, userId, documentId } = options;
    try {
      logger.info(`RAG retrieval (userId=${userId ?? 'global'}): ${query.substring(0, 50)}...`);

      const results = await vectorStoreManager.similaritySearch(query, topK, {
        userId,
        documentId,
      });

      logger.info(`Retrieved ${results.length} relevant chunks`);
      return results;
    } catch (error) {
      logger.error('RAG retrieval error:', error);
      return [];
    }
  }

  formatContextForPrompt(results: RagResult[]): string {
    if (results.length === 0) {
      return 'No relevant context found in uploaded documents.';
    }

    const contextParts = results.map((result, index) => {
      const relevance = Math.round(result.score * 100);
      return `[Context ${index + 1}] (Relevance: ${relevance}%)\n${result.content}`;
    });

    return contextParts.join('\n\n---\n\n');
  }
}
