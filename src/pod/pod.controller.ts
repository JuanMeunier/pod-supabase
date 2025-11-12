import { Controller, Get, Headers, UnauthorizedException, Req, Post, Body } from '@nestjs/common';
import { PodService } from './pod.service';
import { supabase } from 'src/common/supabase.client';
import { SupabaseService } from 'src/supabase/supabase.service';
import { Request } from 'express';

type UploadBody = {
  filename: string;
  contentType?: string;
  data: string; // base64
  visibility?: string; // 'public' | 'community' | 'private'
};

@Controller('pod')
export class PodController {
  constructor(private readonly podService: PodService, private readonly supabaseService: SupabaseService) { }

  /**
   * GET /pod/podAccess - Verifica que el usuario esté autenticado
   * Busca el token en Authorization header o en cookie access_token
   */
  @Get('podAccess')
  async podAccess(@Headers('authorization') authHeader: string, @Req() req: Request) {
    // Intenta obtener token del header Authorization o la cookie
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

  /**
   * POST /pod/upload - Sube un archivo a Supabase Storage y lo registra en la BD
   * 
   * Pasos:
   * 1. Valida que el usuario está autenticado (obtiene token de header o cookie)
   * 2. Convierte el base64 a buffer
   * 3. Sube el archivo al bucket de Supabase Storage
   * 4. Obtiene la URL pública del archivo
   * 5. Crea un registro en la tabla `files` con los metadatos
   * 6. Devuelve el registro creado (id, filename, public_url, etc)
   * 
   * Body esperado:
   * {
   *   "filename": "documento.pdf",
   *   "contentType": "application/pdf",
   *   "data": "JVBERi0xLjQKJeLj...", (base64)
   *   "visibility": "public" | "community" | "private"
   * }
   */
  @Post('upload')
  async upload(
    @Body() body: UploadBody,
    @Headers('authorization') authHeader: string,
    @Req() req: Request,
  ) {
    // 1. Obtener token del usuario
    let token: string | null = null;
    if (authHeader) token = authHeader.replace('Bearer ', '').trim();
    else if (req.cookies?.access_token) token = req.cookies.access_token;

    if (!token) throw new UnauthorizedException('Falta el token de autorización');

    // 2. Validar que el token sea válido
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) throw new UnauthorizedException('Token inválido');

    const user = authData.user;

    // 3. Validar que el payload tenga los campos requeridos
    if (!body || !body.filename || !body.data) {
      throw new UnauthorizedException('Payload incompleto: se requieren filename y data (base64)');
    }

    // 4. Preparar rutas y nombres de archivo
    const bucket = process.env.SUPABASE_BUCKET || 'pod-files';
    const filenameSafe = `${Date.now()}_${body.filename}`; // Agrega timestamp para evitar conflictos
    const storagePath = `users/${user.id}/${filenameSafe}`; // Ruta: users/{user_id}/{timestamp}_{filename}

    const client = this.supabaseService.getClient();

    // 5. Convertir base64 a buffer y subir al bucket
    const buffer = Buffer.from(body.data, 'base64');

    const { error: uploadError } = await client.storage.from(bucket).upload(storagePath, buffer, {
      contentType: body.contentType || 'application/octet-stream',
      upsert: false,
    });
    if (uploadError) throw uploadError;

    // 6. Obtener URL pública del archivo
    const { data: publicUrlData } = client.storage.from(bucket).getPublicUrl(storagePath);
    const publicUrl = (publicUrlData as any)?.publicUrl || null;

    // 7. Crear registro en tabla `files` con metadatos
    const fileRecord = {
      user_id: user.id,
      filename: body.filename,
      storage_path: storagePath,
      public_url: publicUrl,
      visibility: body.visibility || 'private', // Por defecto privado (solo owner ve)
      created_at: new Date().toISOString(),
    };

    const { data: insertData, error: insertError } = await client.from('files').insert(fileRecord).select().single();
    if (insertError) throw insertError;

    // 8. Devolver el registro creado
    return insertData;
  }
}
