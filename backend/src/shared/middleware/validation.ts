// Request Validation Middleware

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from './errorHandler';
import { HTTP_STATUS } from '../constants';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');
      throw new AppError(HTTP_STATUS.BAD_REQUEST, errorMessage);
    }

    req.body = value;
    next();
  };
};

// Common validation schemas
export const schemas = {
  createSession: Joi.object({
    title: Joi.string().required().min(3).max(200),
    description: Joi.string().optional().max(1000),
  }),

  textInput: Joi.object({
    sessionId: Joi.string().uuid().required(),
    inputText: Joi.string().required().min(1).max(10000),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required().min(6),
  }),

  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required().min(6),
    name: Joi.string().required().min(2).max(100),
  }),
};
