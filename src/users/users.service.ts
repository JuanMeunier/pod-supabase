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
      // Intentamos primero hacer un UPDATE por si el usuario ya existe.
      const { data: updatedData, error: updateError } = await client
        .from('users')
        .update(payload)
        .eq('user_id', authUser.id)
        .select();

      if (updateError) {
        this.logger.warn('⚠️ Error al intentar UPDATE (seguiré con INSERT)', updateError.message);
      }

      if (updatedData && Array.isArray(updatedData) && updatedData.length > 0) {
        this.logger.log(`✓ Usuario actualizado: ${authUser.id}`);
        return updatedData;
      }

      // Si no hay match por user_id, intentamos buscar por email (evita duplicados cuando
      // el email ya existía en la BD pero el user_id era distinto o estaba vacío).
      const email = authUser.email || authUser.user_metadata?.email || null;
      if (email) {
        const { data: byEmail, error: byEmailErr } = await client
          .from('users')
          .select('*')
          .eq('email', email)
          .limit(1)
          .maybeSingle();

        if (byEmailErr) {
          this.logger.warn('⚠️ Error buscando usuario por email', byEmailErr.message);
        }

        if (byEmail) {
          // Actualizamos la fila encontrada por email, asignando el user_id y demás campos.
          const updatePayload = { ...payload };
          // No sobreescribimos created_at si ya existía en la fila
          if (byEmail.created_at) delete updatePayload.created_at;

          const { data: updatedByEmail, error: updEmailErr } = await client
            .from('users')
            .update(updatePayload)
            .eq('email', email)
            .select();

          if (updEmailErr) {
            this.logger.error('❌ No se pudo actualizar usuario existente por email', updEmailErr.message);
            throw updEmailErr;
          }

          this.logger.log(`✓ Usuario actualizado por email: ${email} -> ${authUser.id}`);
          return updatedByEmail;
        }
      }

      // Si no existe por user_id ni por email, insertamos nuevo registro.
      const { data: insertData, error: insertError } = await client
        .from('users')
        .insert(payload)
        .select();

      if (insertError) {
        this.logger.error('❌ No se pudo insertar usuario', insertError.message);
        throw insertError;
      }

      this.logger.log(`✓ Usuario insertado: ${authUser.id}`);
      return insertData;
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
