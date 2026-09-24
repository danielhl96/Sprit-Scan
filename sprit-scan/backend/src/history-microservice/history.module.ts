import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { PrismaModule } from './prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../constants/constants';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,

    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '2h' },
    }),
  ],
  controllers: [HistoryController],
  providers: [HistoryService],
})
export class HistoryModule {}
