// Auth Controller

import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { HTTP_STATUS } from '../../shared/constants';

export class AuthController {
  private service: AuthService;

  constructor(service: AuthService = new AuthService()) {
    this.service = service;
  }

  login = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.login(req.body);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
    });
  });

  register = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.register(req.body);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: result,
    });
  });
}
