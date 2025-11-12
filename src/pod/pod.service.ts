import { Injectable } from '@nestjs/common';

@Injectable()
export class PodService {
    /**
     * Verifica que el usuario pueda acceder al pod y devuelve su email
     */
    accessPod(user: any) {
        console.log('✅ Acceso al pod autorizado para:', user.email);
        return {
            message: 'Acceso autorizado al pod 🎉',
            user: user.email,
        };
    }

    /**
     * Placeholder para funciones futuras del servicio
     */
    async getPublicPlaceholder() {
        return { message: 'Pod service ready' };
    }
}
