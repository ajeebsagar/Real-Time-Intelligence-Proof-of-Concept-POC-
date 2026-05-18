// Session Repository

import { prisma } from '../../shared/database';
import { Session } from '@prisma/client';

export interface CreateSessionData {
  userId: string;
  title: string;
  description?: string;
}

export interface UpdateSessionData {
  title?: string;
  description?: string;
  status?: string;
  endedAt?: Date;
}

export interface ISessionRepository {
  create(data: CreateSessionData): Promise<Session>;
  findById(id: string): Promise<Session | null>;
  findByUserId(userId: string, limit?: number): Promise<Session[]>;
  update(id: string, data: UpdateSessionData): Promise<Session>;
  delete(id: string): Promise<void>;
}

export class SessionRepository implements ISessionRepository {
  async create(data: CreateSessionData): Promise<Session> {
    return await prisma.session.create({
      data: {
        userId: data.userId,
        title: data.title,
        description: data.description,
        status: 'active',
      },
    });
  }

  async findById(id: string): Promise<Session | null> {
    return await prisma.session.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        interactions: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
      },
    });
  }

  async findByUserId(userId: string, limit: number = 20): Promise<Session[]> {
    return await prisma.session.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: {
        _count: {
          select: { interactions: true },
        },
      },
    });
  }

  async update(id: string, data: UpdateSessionData): Promise<Session> {
    return await prisma.session.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.session.delete({
      where: { id },
    });
  }
}
