// Analytics Routes

import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authenticate } from '../../shared/middleware/auth';

const router = Router();
const controller = new AnalyticsController();

router.use(authenticate);

router.get('/session/:sessionId', controller.getSessionAnalytics);
router.get('/user', controller.getUserAnalytics);
router.get('/global', controller.getGlobalAnalytics);

export default router;
