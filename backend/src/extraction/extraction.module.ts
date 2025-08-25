// backend/src/extraction/extraction.module.ts
import { Module } from '@nestjs/common';
import { ExtractionController } from './extraction.controller';
import { ExtractionService } from './extraction.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule], // Make sure ConfigModule is imported
  controllers: [ExtractionController],
  providers: [ExtractionService], // Provide the service
})
export class ExtractionModule {}