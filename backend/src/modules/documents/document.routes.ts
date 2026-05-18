// Document Routes

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { DocumentController } from './document.controller';
import { authenticate } from '../../shared/middleware/auth';
import { SUPPORTED_MIME_TYPES, HTTP_STATUS } from '../../shared/constants';
import { FileProcessor } from '../../shared/utils/fileProcessor';
import { AppError } from '../../shared/middleware/errorHandler';
import path from 'path';

const router = Router();
const controller = new DocumentController();

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
FileProcessor.ensureDirectory(uploadDir);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = FileProcessor.generateUniqueFilename(file.originalname);
    cb(null, uniqueName);
  },
});

const ALLOWED_EXTS = new Set(['.pdf', '.txt', '.md', '.docx']);

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeOk = (SUPPORTED_MIME_TYPES as readonly string[]).includes(file.mimetype);
    const extOk = ALLOWED_EXTS.has(ext);
    if (mimeOk || extOk) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  },
});

// Wrap multer to translate its errors into AppError so the centralized
// errorHandler returns a clean 400 instead of leaking a 500.
const uploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err: any) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File is too large'
          : err.message || 'File upload error';
      return next(new AppError(HTTP_STATUS.BAD_REQUEST, message));
    }
    return next(new AppError(HTTP_STATUS.BAD_REQUEST, err.message || 'File upload error'));
  });
};

router.use(authenticate);

router.post('/', uploadMiddleware, controller.upload);
router.get('/', controller.getUserDocuments);
router.get('/:id', controller.getById);
router.delete('/:id', controller.delete);

export default router;
