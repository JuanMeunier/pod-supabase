import { Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Module({
    providers: [SupabaseService],
    exports: [SupabaseService], // solo podés exportarlo si está en providers
})
export class SupabaseModule { }
