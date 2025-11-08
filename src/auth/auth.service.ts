import { Injectable, UnauthorizedException } from "@nestjs/common";
import { supabase } from "src/common/supabase.client";


@Injectable()
export class AuthService {
    async login(email: string) {
        // Obtener la URL base desde las variables de entorno o usar una por defecto
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
            message: 'Se envió un link mágico a tu correo',
            redirectUrl: redirectUrl,
            data 
        };

    }

    async getUserProfile(token: string) {
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) throw new UnauthorizedException('Token inválido');
        return data.user;
    }

    async handleCallback(tokenHash: string) {
        const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'magiclink',
        });

        if (error || !data?.session) {
            throw new UnauthorizedException(error?.message || 'Token inválido');
        }

        return {
            token: data.session.access_token,
            user: data.user,
        };
    }
}

