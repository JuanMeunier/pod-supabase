import { Module } from '@nestjs/common';
import { PodService } from './pod.service';
import { PodController } from './pod.controller';

@Module({
  controllers: [PodController],
  providers: [PodService],
})
export class PodModule {}
