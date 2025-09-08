import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; // 1. Import ValidationPipe

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 2. Enable the global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,      // Strip away properties that do not have any decorators
    transform: true,      // Transform payloads to be instances of DTO classes
  }));

  await app.listen(process.env.PORT ?? 7612);
}
bootstrap();