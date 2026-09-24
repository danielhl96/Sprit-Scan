import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/history-client';

/**
 * PrismaService wraps the generated PrismaClient and makes it injectable.
 *
 * Because it is `@Injectable()`, any provider (e.g. AuthService) can simply ask
 * for it in its constructor and NestJS will hand over a single shared instance
 * (Dependency Injection). No component ever creates `new PrismaClient()` itself.
 *
 * The connection to the database is opened automatically when the module starts
 * (`onModuleInit`).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
}
