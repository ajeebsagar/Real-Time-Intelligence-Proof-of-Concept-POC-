// Auth Repository

import { prisma } from '../../shared/database';
import { User } from '@prisma/client';

export interface IAuthRepository {
  findUserByEmail(email: string): Promise<User | null>;
  createUser(email: string, hashedPassword: string, name: string): Promise<User>;
  findUserById(id: string): Promise<User | null>;
}

export class AuthRepository implements IAuthRepository {
  async findUserByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  async createUser(email: string, hashedPassword: string, name: string): Promise<User> {
    return await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'user',
      },
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id },
    });
  }
}
