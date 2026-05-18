// Realtime Controller

import { Response } from 'express';
import { RealtimeService } from './realtime.service';
import { asyncHandler, AppError } from '../../shared/middleware/errorHandler';
import { AuthRequest } from '../../shared/middleware/auth';
import { HTTP_STATUS } from '../../shared/constants';
import logger from '../../shared/logger';

export class RealtimeController {
  private service: RealtimeService;

  constructor(service: RealtimeService = new RealtimeService()) {
    this.service = service;
  }

  processText = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { sessionId, inputText } = req.body ?? {};
    if (!sessionId) throw new AppError(HTTP_STATUS.BAD_REQUEST, 'sessionId is required');
    if (!inputText) throw new AppError(HTTP_STATUS.BAD_REQUEST, 'inputText is required');

    // Fire-and-forget: results are delivered via WebSocket events.
    void this.service
      .processTextInput({
        sessionId,
        userId: req.user!.id,
        inputText,
        type: 'text',
      })
      .catch((err) => logger.error('Async text processing failed', err));

    res.status(HTTP_STATUS.ACCEPTED).json({
      success: true,
      message: 'Input processing started',
    });
  });

  processAudio = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      throw new AppError(HTTP_STATUS.BAD_REQUEST, 'No audio file uploaded');
    }
    const { sessionId } = req.body ?? {};
    if (!sessionId) throw new AppError(HTTP_STATUS.BAD_REQUEST, 'sessionId is required');

    void this.service
      .processAudioInput({
        sessionId,
        userId: req.user!.id,
        audioPath: req.file.path,
        type: 'audio',
      })
      .catch((err) => logger.error('Async audio processing failed', err));

    res.status(HTTP_STATUS.ACCEPTED).json({
      success: true,
      message: 'Audio processing started',
    });
  });

  getHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const history = await this.service.getInteractionHistory(
      req.params.sessionId,
      parseInt(req.query.limit as string) || 50
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: history,
    });
  });
}
