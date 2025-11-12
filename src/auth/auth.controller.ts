import { Body, Controller, Get, Post, Headers, Query, UnauthorizedException, Res, Req } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { UsersService } from "src/users/users.service";
import { Response, Request } from "express";

@Controller('auth')
export class AuthController {

    constructor(private readonly authService: AuthService, private readonly usersService: UsersService) { }
    @Post('login')
    async login(@Body() body: { email: string }) {
        return this.authService.login(body.email);
    }

    /**
     * GET /auth/me - Devuelve el perfil del usuario autenticado
     * Busca el token en Authorization header o en cookie access_token
     */
    @Get('me')
    async me(@Headers('authorization') authHeader: string, @Req() req: Request) {
        // Primero intenta obtener token del header Authorization (formato: Bearer <token>)
        let token: string | undefined;

        if (authHeader) {
            token = authHeader.replace('Bearer ', '').trim();
        }

        // Si no hay token en header, busca en cookie (la que guardó el navegador tras login)
        if (!token && req.cookies && (req.cookies as any).access_token) {
            token = (req.cookies as any).access_token;
        }

        if (!token) {
            throw new UnauthorizedException('Falta el token de autorización');
        }

        const user = await this.authService.getUserProfile(token);
        return { message: 'Usuario autenticado ✓', user };
    }

    /**
     * GET /auth/callback - Endpoint que Supabase llama tras hacer click en el magic link
     * 1. Valida el token_hash del magic link
     * 2. Guarda el access_token en una cookie httpOnly (segura)
     * 3. Crea/actualiza el usuario en la tabla users
     * 4. Redirige a /pod
     */
    @Get('callback')
    async callback(@Query() query: any, @Res() res: Response) {
        // Caso 1: Supabase envía token_hash como query param (magic link confirmado)
        if (query.token_hash) {
            const result = await this.authService.handleCallback(query.token_hash);
            // Guarda cookie httpOnly para que el navegador la envíe automáticamente
            res.cookie('access_token', result.token, { httpOnly: true, maxAge: 3600000 }); // Expira en 1 hora
            // Upsert: crea o actualiza el usuario en tabla users con role='free' por defecto
            try {
                await this.usersService.upsertFromAuth(result.user);
            } catch (e) {
                // No bloquea el login si falla el upsert, pero lo loguea
                console.error('❌ Error al crear usuario:', e?.message || e);
            }
            return res.redirect('/pod');
        }

        // Caso 2: Token ya viene como query param (redirigido desde HTML que capturó el fragment)
        if (query.access_token) {
            const user = await this.authService.getUserProfile(query.access_token);
            res.cookie('access_token', query.access_token, { httpOnly: true, maxAge: 3600000 }); // 1 hora
            try {
                await this.usersService.upsertFromAuth(user);
            } catch (e) {
                console.error('❌ Error al crear usuario:', e?.message || e);
            }
            return res.redirect('/pod');
        }

        // Caso 3: Sin token en query → Supabase envía token en fragment (#access_token=...)
        // El fragment NO llega al servidor, así que devolvemos una página HTML con JS que:
        // 1. Extrae el token del fragment (#access_token=...)
        // 2. Redirije al servidor con el token como query param (?access_token=...)
        // 3. El servidor procesa el caso 2 (token en query)
        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Autenticación</title>
</head>
<body>
    <script>
        (function() {
            const hash = window.location.hash; // Obtiene el fragment (#access_token=...)
            if (hash) {
                // Convierte el fragment a parámetros (igual que query string)
                const params = new URLSearchParams(hash.substring(1));
                const accessToken = params.get('access_token');
                if (accessToken) {
                    // Redirije al servidor pasando el token como query param
                    window.location.replace('/auth/callback?access_token=' + encodeURIComponent(accessToken));
                    return;
                }
            }
            // Si no hay token, redirige a la app
            window.location.replace('/pod');
        })();
    </script>
    <p>⏳ Procesando autenticación...</p>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
    }
}