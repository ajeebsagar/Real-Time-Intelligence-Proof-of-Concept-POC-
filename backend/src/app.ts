// Main Application Entry Point

import express, { Application } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Import infrastructure
import DatabaseClient from './shared/database';
import webSocketManager from './infrastructure/websocket/WebSocketManager';
import vectorStoreManager from './infrastructure/vectorstore/VectorStoreManager';
import logger from './shared/logger';

// Import middleware
import { errorHandler } from './shared/middleware/errorHandler';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import sessionRoutes from './modules/sessions/session.routes';
import documentRoutes from './modules/documents/document.routes';
import realtimeRoutes from './modules/realtime/realtime.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';

class App {
  public app: Application;
  private httpServer;
  private port: number;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.port = parseInt(process.env.PORT || '5000');

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // CORS
    this.app.use(
      cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
      })
    );

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Static files
    this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    // Request logging
    this.app.use((req, _res, next) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/sessions', sessionRoutes);
    this.app.use('/api/documents', documentRoutes);
    this.app.use('/api/input', realtimeRoutes);
    this.app.use('/api/analytics', analyticsRoutes);

    // 404 handler
    this.app.use((_req, res) => {
      res.status(404).json({
        success: false,
        error: 'Route not found',
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await DatabaseClient.connect();
      logger.info('Database connected');

      // Initialize vector store
      await vectorStoreManager.initialize();
      logger.info('Vector store initialized');

      // Initialize WebSocket
      webSocketManager.initialize(this.httpServer);
      logger.info('WebSocket initialized');

      // Start server
      this.httpServer.listen(this.port, () => {
        logger.info(`Server running on port ${this.port}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      });
    } catch (error) {
      logger.error('Failed to start application:', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    try {
      await DatabaseClient.disconnect();
      logger.info('Application stopped gracefully');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }
}

// Create and start application
const application = new App();
application.start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await application.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await application.stop();
  process.exit(0);
});

export default application;
