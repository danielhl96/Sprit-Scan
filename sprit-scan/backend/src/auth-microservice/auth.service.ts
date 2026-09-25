import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

type acesses_token = string;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    email: string,
    password: string,
  ): Promise<{ access_token: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare the plain password against the stored argon2 hash.
    const passwordValid = await argon2.verify(user.password, password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = this.jwtService.sign(
      {
        userId: user.userId,
        email: user.email,
      },
      { expiresIn: '2h', secret: process.env.JWT_SECRET },
    );
    return { access_token: token };
  }

  async register(email: string, password: string): Promise<string> {
    const hashedPassword = await argon2.hash(password);

    try {
      await this.prisma.user.create({
        data: { email, password: hashedPassword },
      });
      return 'User registered successfully';
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
      ) {
        throw new ConflictException('User already exists');
      }

      throw new InternalServerErrorException('User registration failed');
    }
  }

  async deleteUser(userId: string, password: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const passwordValid = await argon2.verify(user.password, password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.delete({ where: { userId } });
  }
}
