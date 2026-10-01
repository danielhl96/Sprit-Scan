import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { PrismaModule } from './prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { HistoryConsumerController } from './history-consumer.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,

    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '2h' },
    }),
  ],
  controllers: [HistoryController, HistoryConsumerController],
  providers: [HistoryService],
})
export class HistoryModule {}
