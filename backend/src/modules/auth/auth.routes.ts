// Auth Routes

import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate, schemas } from '../../shared/middleware/validation';

const router = Router();
const controller = new AuthController();

router.post('/login', validate(schemas.login), controller.login);
router.post('/register', validate(schemas.register), controller.register);

export default router;
