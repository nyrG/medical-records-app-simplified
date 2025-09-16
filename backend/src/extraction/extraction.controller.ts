// backend/src/extraction/extraction.controller.ts

import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException, UseFilters, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExtractionService } from './extraction.service';
import { GeminiApiExceptionFilter } from './gemini-api.filter'; // 1. Import the filter

@Controller('api/extraction')
@UseFilters(new GeminiApiExceptionFilter())
export class ExtractionController {
  constructor(private readonly extractionService: ExtractionService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File, 
    @Body('model') model: string,
    @Body('documentType') documentType: string // Add documentType here
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }
    
    return this.extractionService.extractDataFromPdf(file, model || 'gemini-2.5-flash-lite', documentType);
  }
}