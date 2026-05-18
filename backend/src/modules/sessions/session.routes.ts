// Session Routes

import { Router } from 'express';
import { SessionController } from './session.controller';
import { authenticate } from '../../shared/middleware/auth';
import { validate, schemas } from '../../shared/middleware/validation';

const router = Router();
const controller = new SessionController();

router.use(authenticate);

router.post('/', validate(schemas.createSession), controller.create);
router.get('/', controller.getUserSessions);
router.get('/:id', controller.getById);
router.patch('/:id/status', controller.updateStatus);
router.delete('/:id', controller.delete);

export default router;
