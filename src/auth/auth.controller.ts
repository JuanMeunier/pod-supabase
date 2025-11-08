import { Body, Controller, Get, Post, Headers, Query, UnauthorizedException, Res } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Response } from "express";

@Controller('auth')
export class AuthController {

    constructor(private readonly authService: AuthService) { }
    @Post('login')
    async login(@Body() body: { email: string }) {
        return this.authService.login(body.email);
    }

    @Get('profile')
    async me(@Headers('authorization') authHeader: string) {
        if (!authHeader) {
            throw new UnauthorizedException('Falta el token de autorización');
        }
        const token = authHeader.replace('Bearer ', '').trim();
        const user = await this.authService.getUserProfile(token);
        return { message: 'Usuario autenticado', user };
    }

    @Get('callback')
    async callback(@Query() query: any, @Res() res: Response) {
        // Si hay token_hash en query params, procesarlo
        if (query.token_hash) {
            const result = await this.authService.handleCallback(query.token_hash);
            res.cookie('access_token', result.token, { httpOnly: true, maxAge: 3600000 }); // 1 hora
            return res.redirect('/pod');
        }
        
        // Si hay access_token en query params, guardarlo en cookie y redirigir
        if (query.access_token) {
            const user = await this.authService.getUserProfile(query.access_token);
            res.cookie('access_token', query.access_token, { httpOnly: true, maxAge: 3600000 }); // 1 hora
            return res.redirect('/pod');
        }
        
        // El token está en el hash (#) - leer access_token o token_hash
        return res.send(`<!DOCTYPE html>
<html>
<head><title>Autenticando...</title><meta charset="utf-8"></head>
<body>
<script>
const hash = window.location.hash.substring(1);
const params = new URLSearchParams(hash);
const accessToken = params.get('access_token');
const tokenHash = params.get('token_hash');

if (accessToken) {
    // Verificar token y guardar en cookie, luego redirigir al pod
    fetch(window.location.pathname + '?access_token=' + encodeURIComponent(accessToken))
        .then(r => {
            if (r.ok) return r.json();
            throw new Error('Error al verificar token');
        })
        .then(() => {
            // Redirigir al pod - la cookie ya se guardó en el servidor
            window.location.href = '/pod';
        })
        .catch(e => {
            document.body.innerHTML = '<h1>❌ Error: ' + e.message + '</h1>';
        });
} else if (tokenHash) {
    // Si tenemos token_hash, verificarlo
    fetch(window.location.pathname + '?token_hash=' + encodeURIComponent(tokenHash))
        .then(r => {
            if (r.ok) {
                window.location.href = '/pod';
            } else {
                throw new Error('Error al verificar token');
            }
        })
        .catch(e => {
            document.body.innerHTML = '<h1>❌ Error: ' + e.message + '</h1>';
        });
} else {
    document.body.innerHTML = '<h1>❌ Token no encontrado</h1><p>Hash: ' + hash + '</p>';
}
</script>
</body>
</html>`);
    }

}