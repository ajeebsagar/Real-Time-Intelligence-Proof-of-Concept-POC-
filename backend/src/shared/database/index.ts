// Prisma Database Client

import { PrismaClient } from '@prisma/client';
import logger from '../logger';

class DatabaseClient {
  private static instance: PrismaClient;

  private constructor() {}

  public static getInstance(): PrismaClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new PrismaClient({
        log: [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ],
      });

      // Log queries in development
      if (process.env.NODE_ENV === 'development') {
        DatabaseClient.instance.$on('query' as never, (e: any) => {
          logger.debug('Query: ' + e.query);
          logger.debug('Duration: ' + e.duration + 'ms');
        });
      }

      DatabaseClient.instance.$on('error' as never, (e: any) => {
        logger.error('Prisma Error:', e);
      });

      DatabaseClient.instance.$on('warn' as never, (e: any) => {
        logger.warn('Prisma Warning:', e);
      });
    }

    return DatabaseClient.instance;
  }

  public static async connect(): Promise<void> {
    try {
      await DatabaseClient.getInstance().$connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  public static async disconnect(): Promise<void> {
    try {
      await DatabaseClient.getInstance().$disconnect();
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Database disconnection failed:', error);
      throw error;
    }
  }
}

export const prisma = DatabaseClient.getInstance();
export default DatabaseClient;
