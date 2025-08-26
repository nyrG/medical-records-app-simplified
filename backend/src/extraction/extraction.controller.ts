// backend/src/extraction/extraction.controller.ts

import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException, UseFilters } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExtractionService } from './extraction.service';
import { GeminiApiExceptionFilter } from './gemini-api.filter'; // 1. Import the filter

@Controller('api/extraction')
@UseFilters(new GeminiApiExceptionFilter())
export class ExtractionController {
  constructor(private readonly extractionService: ExtractionService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }
    
    // CHANGE THIS LINE: Pass the entire 'file' object
    return this.extractionService.extractDataFromPdf(file);
  }
}