// Document Service

import { DocumentRepository, IDocumentRepository } from './document.repository';
import { FileProcessor } from '../../shared/utils/fileProcessor';
import vectorStoreManager from '../../infrastructure/vectorstore/VectorStoreManager';
import webSocketManager from '../../infrastructure/websocket/WebSocketManager';
import { AppError } from '../../shared/middleware/errorHandler';
import {
  HTTP_STATUS,
  DOCUMENT_STATUS,
  MAX_CHUNK_SIZE,
  CHUNK_OVERLAP,
  SOCKET_EVENTS,
} from '../../shared/constants';
import logger from '../../shared/logger';

export class DocumentService {
  private repository: IDocumentRepository;

  constructor(repository: IDocumentRepository = new DocumentRepository()) {
    this.repository = repository;
  }

  async uploadDocument(userId: string, file: Express.Multer.File) {
    try {
      // Create document record
      const document = await this.repository.create({
        userId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
      });

      logger.info(`Document uploaded: ${document.id}`);

      // Notify the user that processing has started so the UI can show the spinner immediately.
      webSocketManager.emitToUser(userId, SOCKET_EVENTS.DOCUMENT_STATUS, {
        documentId: document.id,
        status: DOCUMENT_STATUS.PROCESSING,
      });

      // Process document asynchronously
      this.processDocument(document.id, userId, file.path, file.mimetype).catch((error) => {
        logger.error(`Document processing failed: ${document.id}`, error);
      });

      return document;
    } catch (error) {
      logger.error('Document upload error:', error);
      throw error;
    }
  }

  private async processDocument(
    documentId: string,
    userId: string,
    filePath: string,
    mimeType: string
  ) {
    const t0 = Date.now();
    try {
      logger.info(`Processing document: ${documentId}`);

      // 1. Extract text
      const tExtract0 = Date.now();
      const text = await FileProcessor.extractText(filePath, mimeType);
      const tExtract = Date.now() - tExtract0;

      // 2. Chunk text
      const chunks = FileProcessor.chunkText(text, MAX_CHUNK_SIZE, CHUNK_OVERLAP).filter(
        (c) => c.length > 0
      );

      if (chunks.length === 0) {
        logger.warn(`Document ${documentId} produced 0 chunks`);
        await this.repository.updateStatus(documentId, DOCUMENT_STATUS.READY, new Date());
        return;
      }

      // 3. Batch-insert chunks (single SQL round-trip)
      const tInsert0 = Date.now();
      const chunkData = chunks.map((content, i) => ({
        documentId,
        content,
        chunkIndex: i,
        metadata: JSON.stringify({ documentId, userId, chunkIndex: i }),
      }));
      const savedChunks = await this.repository.createChunks(chunkData);
      const tInsert = Date.now() - tInsert0;

      // 4. Build vector docs and add to FAISS (this triggers embedding)
      const tEmbed0 = Date.now();
      const vectorDocuments = savedChunks.map((chunk) => ({
        id: chunk.id,
        content: chunk.content,
        metadata: {
          documentId,
          userId,
          chunkIndex: chunk.chunkIndex,
        },
      }));
      await vectorStoreManager.addDocuments(vectorDocuments);
      const tEmbed = Date.now() - tEmbed0;

      // 5. Mark ready + notify the user
      await this.repository.updateStatus(documentId, DOCUMENT_STATUS.READY, new Date());
      webSocketManager.emitToUser(userId, SOCKET_EVENTS.DOCUMENT_STATUS, {
        documentId,
        status: DOCUMENT_STATUS.READY,
        chunks: vectorDocuments.length,
      });

      const tTotal = Date.now() - t0;
      logger.info(
        `Document ${documentId} processed in ${tTotal}ms ` +
          `(extract: ${tExtract}ms, db-insert: ${tInsert}ms, embed: ${tEmbed}ms, chunks: ${vectorDocuments.length})`
      );
    } catch (error) {
      logger.error(`Document processing error: ${documentId}`, error);
      await this.repository.updateStatus(documentId, DOCUMENT_STATUS.FAILED);
      webSocketManager.emitToUser(userId, SOCKET_EVENTS.DOCUMENT_STATUS, {
        documentId,
        status: DOCUMENT_STATUS.FAILED,
        error: error instanceof Error ? error.message : 'Processing failed',
      });
      throw error;
    }
  }

  async getDocument(id: string) {
    const document = await this.repository.findById(id);

    if (!document) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, 'Document not found');
    }

    return document;
  }

  async getUserDocuments(userId: string) {
    return await this.repository.findByUserId(userId);
  }

  async deleteDocument(id: string) {
    const document = await this.repository.findById(id);

    if (!document) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, 'Document not found');
    }

    // Delete from database FIRST so the vector-store rebuild reads the post-delete state.
    // Cascade removes document_chunks automatically.
    await this.repository.delete(id);

    // Best-effort cleanup of the uploaded file.
    try {
      await FileProcessor.deleteFile(document.path);
    } catch (err) {
      logger.warn(`Failed to delete file for document ${id}`, err);
    }

    // Rebuild FAISS index from remaining chunks.
    await vectorStoreManager.deleteDocumentChunks(id);

    logger.info(`Document deleted: ${id}`);
  }
}
