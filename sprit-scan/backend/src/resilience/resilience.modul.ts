import { Module } from '@nestjs/common';
import { ResilienceService } from './resilience.service';

@Module({
  providers: [ResilienceService],
  exports: [ResilienceService],
})
export class ResilienceModule {}
