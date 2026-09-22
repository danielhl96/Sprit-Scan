import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare the plain password against the stored argon2 hash.
    const passwordValid = await argon2.verify(user.password, password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return { userId: user.userId, email: user.email };
  }

  async register(email: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('User already exists');
    }

    // Never store the plain password – hash it with argon2 first.
    const hashedPassword = await argon2.hash(password);
    return this.prisma.user.create({
      data: { email, password: hashedPassword },
    });
  }

  logout(): void {
    // Implement your logout logic here
  }
}
