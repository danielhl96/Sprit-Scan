import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * PrismaModule provides the PrismaService via Dependency Injection.
 *
 * By `exports`-ing PrismaService, any module that imports PrismaModule
 * (e.g. AuthModule) can inject PrismaService without creating it manually.
 */
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
