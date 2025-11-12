import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly supabaseService: SupabaseService) { }

  /**
   * Crea o actualiza un registro de usuario en la tabla `users` de Supabase.
   * Se ejecuta automáticamente tras hacer login con magic link.
   * Asigna role='free' por defecto (se puede cambiar luego con updateRole).
   */
  async upsertFromAuth(authUser: any) {
    const client = this.supabaseService.getClient();

    const payload: any = {
      user_id: authUser.id,
      first_name: authUser.user_metadata?.first_name || null,
      last_name: authUser.user_metadata?.last_name || null,
      pod_web_id: authUser.user_metadata?.pod_web_id || null,
      privacy_type: authUser.user_metadata?.privacy_type || null,
      created_at: new Date().toISOString(),
      // El role por defecto 'free' se asigna en la BD (DEFAULT 'free')
    };

    try {
      const { data, error } = await client.from('users').upsert(payload, { onConflict: 'user_id' });
      if (error) {
        this.logger.error('❌ No se pudo hacer upsert del usuario', error.message);
        throw error;
      }
      this.logger.log(`✓ Usuario upsert: ${authUser.id}`);
      return data;
    } catch (err) {
      this.logger.error('❌ Error en upsertFromAuth', err);
      throw err;
    }
  }

  /**
   * Busca un usuario en la tabla `users` por su user_id
   */
  async findByUserId(userId: string) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.from('users').select('*').eq('user_id', userId).limit(1).maybeSingle();
    if (error) throw error;
    return data;
  }

  /**
   * Cambia el role de un usuario (ej: 'free' -> 'community' -> 'stakeholder')
   * Útil para actualizar permisos manualmente o tras validación
   */
  async updateRole(userId: string, role: string) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.from('users').update({ role }).eq('user_id', userId);
    if (error) throw error;
    this.logger.log(`✓ Role actualizado: ${userId} -> ${role}`);
    return data;
  }
}
