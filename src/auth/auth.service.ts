import { Injectable, UnauthorizedException } from "@nestjs/common";
import { supabase } from "src/common/supabase.client";


@Injectable()
export class AuthService {
    /**
     * Envía un magic link al email del usuario.
     * Supabase genera un link con token que redirige a /auth/callback
     */
    async login(email: string) {
        // Obtener URL de redirección desde env vars o usar localhost por defecto
        const redirectUrl = process.env.REDIRECT_URL || 'http://localhost:3000/auth/callback';

        const { data, error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: true,
                emailRedirectTo: redirectUrl,
            },
        });

        if (error) throw new UnauthorizedException(error.message);

        return {
            message: 'Se envió un link mágico a tu correo 📧',
            redirectUrl: redirectUrl,
            data
        };
    }

    /**
     * Valida un token de acceso y devuelve el perfil del usuario autenticado
     */
    async getUserProfile(token: string) {
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) throw new UnauthorizedException('Token inválido o expirado');
        return data.user;
    }

    /**
     * Procesa el callback del magic link: verifica token_hash y devuelve la sesión
     */
    async handleCallback(tokenHash: string) {
        const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'magiclink',
        });

        if (error || !data?.session) {
            throw new UnauthorizedException(error?.message || 'Token inválido o expirado');
        }

        return {
            token: data.session.access_token,
            user: data.user,
        };
    }
}

