import { Injectable } from '@nestjs/common';

@Injectable()
export class PodService {
    accessPod(user: any) {
        console.log('✅ Acceso al pod por:', user.email);
        return {
            message: 'Acceso autorizado al pod',
            user: user.email,
        };
    }
}
