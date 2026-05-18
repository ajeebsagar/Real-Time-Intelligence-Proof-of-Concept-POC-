// Document Controller

import { Response } from 'express';
import { DocumentService } from './document.service';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { AuthRequest } from '../../shared/middleware/auth';
import { HTTP_STATUS } from '../../shared/constants';

export class DocumentController {
  private service: DocumentService;

  constructor(service: DocumentService = new DocumentService()) {
    this.service = service;
  }

  upload = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'No file uploaded',
      });
      return;
    }

    const document = await this.service.uploadDocument(req.user!.id, req.file);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: document,
    });
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const document = await this.service.getDocument(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: document,
    });
  });

  getUserDocuments = asyncHandler(async (req: AuthRequest, res: Response) => {
    const documents = await this.service.getUserDocuments(req.user!.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: documents,
    });
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.service.deleteDocument(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Document deleted successfully',
    });
  });
}
