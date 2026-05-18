// Analytics Controller

import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { AuthRequest } from '../../shared/middleware/auth';
import { HTTP_STATUS } from '../../shared/constants';

export class AnalyticsController {
  private service: AnalyticsService;

  constructor(service: AnalyticsService = new AnalyticsService()) {
    this.service = service;
  }

  getSessionAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
    const analytics = await this.service.getSessionAnalytics(req.params.sessionId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: analytics,
    });
  });

  getUserAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
    const analytics = await this.service.getUserAnalytics(req.user!.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: analytics,
    });
  });

  getGlobalAnalytics = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const analytics = await this.service.getGlobalAnalytics();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: analytics,
    });
  });
}
