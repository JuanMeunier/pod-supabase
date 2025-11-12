import { Module } from '@nestjs/common';
import { PodService } from './pod.service';
import { PodController } from './pod.controller';
import { SupabaseModule } from 'src/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [PodController],
  providers: [PodService],
})
export class PodModule { }
