// Realtime Routes

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { RealtimeController } from './realtime.controller';
import { authenticate } from '../../shared/middleware/auth';
import { validate, schemas } from '../../shared/middleware/validation';
import { FileProcessor } from '../../shared/utils/fileProcessor';
import { AppError } from '../../shared/middleware/errorHandler';
import { HTTP_STATUS } from '../../shared/constants';

const router = Router();
const controller = new RealtimeController();

// Configure multer for audio uploads
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

const upload = multer({
  storage,
  limits: {
    // Recorded audio (webm/opus) can grow past 10 MB for >1-minute clips.
    fileSize: 25 * 1024 * 1024, // 25MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are accepted'));
    }
  },
});

const audioUploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
  upload.single('audio')(req, res, (err: any) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Audio file is too large (max 25 MB)'
          : err.message || 'Audio upload error';
      return next(new AppError(HTTP_STATUS.BAD_REQUEST, message));
    }
    return next(new AppError(HTTP_STATUS.BAD_REQUEST, err.message || 'Audio upload error'));
  });
};

router.use(authenticate);

router.post('/text', validate(schemas.textInput), controller.processText);
router.post('/audio', audioUploadMiddleware, controller.processAudio);
router.get('/history/:sessionId', controller.getHistory);

export default router;
