import { Controller, Get, Headers, UnauthorizedException, Req } from '@nestjs/common';
import { PodService } from './pod.service';
import { supabase } from 'src/common/supabase.client';
import { Request } from 'express';

@Controller('pod')
export class PodController {
  constructor(private readonly podService: PodService) {}

  @Get('')
  async accessPod(@Headers('authorization') authHeader: string, @Req() req: Request) {
    // Buscar token en header Authorization o en cookie
    let token: string | null = null;
    
    if (authHeader) {
      token = authHeader.replace('Bearer ', '').trim();
    } else if (req.cookies?.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      throw new UnauthorizedException('Falta el token de autorización');
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    return this.podService.accessPod(data.user);
  }
}
