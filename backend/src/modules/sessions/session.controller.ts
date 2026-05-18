// Session Controller

import { Response } from 'express';
import { SessionService } from './session.service';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { AuthRequest } from '../../shared/middleware/auth';
import { HTTP_STATUS } from '../../shared/constants';

export class SessionController {
  private service: SessionService;

  constructor(service: SessionService = new SessionService()) {
    this.service = service;
  }

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const session = await this.service.createSession({
      userId: req.user!.id,
      title: req.body.title,
      description: req.body.description,
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: session,
    });
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const session = await this.service.getSession(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: session,
    });
  });

  getUserSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const sessions = await this.service.getUserSessions(req.user!.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: sessions,
    });
  });

  updateStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const session = await this.service.updateSessionStatus(
      req.params.id,
      req.body.status
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: session,
    });
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.service.deleteSession(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Session deleted successfully',
    });
  });
}
