// Document Repository

import { prisma } from '../../shared/database';
import { Document, DocumentChunk } from '@prisma/client';

export interface CreateDocumentData {
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
}

export interface CreateChunkData {
  documentId: string;
  content: string;
  embedding?: string;
  chunkIndex: number;
  metadata?: any;
}

export interface IDocumentRepository {
  create(data: CreateDocumentData): Promise<Document>;
  findById(id: string): Promise<Document | null>;
  findByUserId(userId: string): Promise<Document[]>;
  updateStatus(id: string, status: string, processedAt?: Date): Promise<Document>;
  delete(id: string): Promise<void>;
  createChunk(data: CreateChunkData): Promise<DocumentChunk>;
  createChunks(data: CreateChunkData[]): Promise<DocumentChunk[]>;
  findChunksByDocumentId(documentId: string): Promise<DocumentChunk[]>;
  deleteChunksByDocumentId(documentId: string): Promise<void>;
}

export class DocumentRepository implements IDocumentRepository {
  async create(data: CreateDocumentData): Promise<Document> {
    return await prisma.document.create({
      data,
    });
  }

  async findById(id: string): Promise<Document | null> {
    return await prisma.document.findUnique({
      where: { id },
      include: {
        chunks: true,
      },
    });
  }

  async findByUserId(userId: string): Promise<Document[]> {
    return await prisma.document.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
      include: {
        _count: {
          select: { chunks: true },
        },
      },
    });
  }

  async updateStatus(id: string, status: string, processedAt?: Date): Promise<Document> {
    return await prisma.document.update({
      where: { id },
      data: {
        status,
        processedAt: processedAt || new Date(),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.document.delete({
      where: { id },
    });
  }

  async createChunk(data: CreateChunkData): Promise<DocumentChunk> {
    return await prisma.documentChunk.create({
      data,
    });
  }

  async createChunks(data: CreateChunkData[]): Promise<DocumentChunk[]> {
    if (data.length === 0) return [];
    // Use a single transaction with createMany for a single round-trip,
    // then fetch the rows back (createMany doesn't return rows).
    await prisma.documentChunk.createMany({ data });
    return await prisma.documentChunk.findMany({
      where: { documentId: data[0].documentId },
      orderBy: { chunkIndex: 'asc' },
    });
  }

  async findChunksByDocumentId(documentId: string): Promise<DocumentChunk[]> {
    return await prisma.documentChunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: 'asc' },
    });
  }

  async deleteChunksByDocumentId(documentId: string): Promise<void> {
    await prisma.documentChunk.deleteMany({
      where: { documentId },
    });
  }
}
