// Auth Service

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRepository, IAuthRepository } from './auth.repository';
import { AppError } from '../../shared/middleware/errorHandler';
import { HTTP_STATUS } from '../../shared/constants';
import logger from '../../shared/logger';

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export class AuthService {
  private repository: IAuthRepository;
  private jwtSecret: string;

  constructor(repository: IAuthRepository = new AuthRepository()) {
    this.repository = repository;
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret';
  }

  async login(dto: LoginDTO): Promise<AuthResponse> {
    const user = await this.repository.findUserByEmail(dto.email);

    if (!user) {
      throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'Invalid credentials');
    }

    const token = this.generateToken(user.id, user.email, user.role);

    logger.info(`User logged in: ${user.email}`);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async register(dto: RegisterDTO): Promise<AuthResponse> {
    const existingUser = await this.repository.findUserByEmail(dto.email);

    if (existingUser) {
      throw new AppError(HTTP_STATUS.CONFLICT, 'User already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.repository.createUser(dto.email, hashedPassword, dto.name);

    const token = this.generateToken(user.id, user.email, user.role);

    logger.info(`User registered: ${user.email}`);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async validateToken(token: string): Promise<{ id: string; email: string; role: string }> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as {
        id: string;
        email: string;
        role: string;
      };
      return decoded;
    } catch (error) {
      throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'Invalid token');
    }
  }

  private generateToken(id: string, email: string, role: string): string {
    return jwt.sign({ id, email, role }, this.jwtSecret, {
      expiresIn: '7d',
    });
  }
}
