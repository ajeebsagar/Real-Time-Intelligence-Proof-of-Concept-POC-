// Session Service

import { SessionRepository, ISessionRepository } from './session.repository';
import { AppError } from '../../shared/middleware/errorHandler';
import { HTTP_STATUS, SESSION_STATUS } from '../../shared/constants';
import logger from '../../shared/logger';

export interface CreateSessionDTO {
  userId: string;
  title: string;
  description?: string;
}

export class SessionService {
  private repository: ISessionRepository;

  constructor(repository: ISessionRepository = new SessionRepository()) {
    this.repository = repository;
  }

  async createSession(dto: CreateSessionDTO) {
    const session = await this.repository.create(dto);
    logger.info(`Session created: ${session.id}`);
    return session;
  }

  async getSession(id: string) {
    const session = await this.repository.findById(id);

    if (!session) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, 'Session not found');
    }

    return session;
  }

  async getUserSessions(userId: string, limit?: number) {
    return await this.repository.findByUserId(userId, limit);
  }

  async updateSessionStatus(id: string, status: string) {
    const session = await this.repository.findById(id);

    if (!session) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, 'Session not found');
    }

    const updateData: any = { status };

    if (status === SESSION_STATUS.COMPLETED) {
      updateData.endedAt = new Date();
    }

    const updated = await this.repository.update(id, updateData);
    logger.info(`Session status updated: ${id} -> ${status}`);

    return updated;
  }

  async deleteSession(id: string) {
    const session = await this.repository.findById(id);

    if (!session) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, 'Session not found');
    }

    await this.repository.delete(id);
    logger.info(`Session deleted: ${id}`);
  }
}
