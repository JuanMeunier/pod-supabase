import { config } from 'dotenv';
config(); // Cargar variables de entorno antes de cualquier otra importación

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  await app.listen(process.env.PORT ?? 3000);
  console.log(`Servidor escuchando en http://localhost:${process.env.PORT ?? 3000}`);
}
bootstrap();
