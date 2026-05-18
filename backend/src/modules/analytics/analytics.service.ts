// Analytics Service

import { AnalyticsRepository, IAnalyticsRepository } from './analytics.repository';
import logger from '../../shared/logger';

export class AnalyticsService {
  private repository: IAnalyticsRepository;

  constructor(repository: IAnalyticsRepository = new AnalyticsRepository()) {
    this.repository = repository;
  }

  async getSessionAnalytics(sessionId: string) {
    try {
      const analytics = await this.repository.getSessionStats(sessionId);
      logger.info(`Analytics retrieved for session: ${sessionId}`);
      return analytics;
    } catch (error) {
      logger.error('Analytics retrieval error:', error);
      throw error;
    }
  }

  async getUserAnalytics(userId: string) {
    try {
      const analytics = await this.repository.getUserStats(userId);
      logger.info(`Analytics retrieved for user: ${userId}`);
      return analytics;
    } catch (error) {
      logger.error('User analytics retrieval error:', error);
      throw error;
    }
  }

  async getGlobalAnalytics() {
    try {
      const analytics = await this.repository.getGlobalStats();
      logger.info('Global analytics retrieved');
      return analytics;
    } catch (error) {
      logger.error('Global analytics retrieval error:', error);
      throw error;
    }
  }
}
