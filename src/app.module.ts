import { Module } from '@nestjs/common';
import { SupabaseModule } from './supabase/supabase.module';
import { UsersModule } from './users/users.module';
import { PodModule } from './pod/pod.module';
import { AuthModule } from './auth/auth.module';



@Module({
  imports: [SupabaseModule, UsersModule, PodModule, AuthModule],
})
export class AppModule { }
