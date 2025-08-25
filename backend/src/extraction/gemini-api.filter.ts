// backend/src/extraction/gemini-api.filter.ts

import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { GoogleGenerativeAIFetchError } from '@google/generative-ai';

@Catch(GoogleGenerativeAIFetchError)
export class GeminiApiExceptionFilter implements ExceptionFilter {
  catch(exception: GoogleGenerativeAIFetchError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred with the AI service.';

    // Check if the error is a rate-limiting error (status code 429)
    if (exception.status === 429) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      message = 'API request limit reached. Please wait a moment and try again.';
    }

    response.status(status).json({
      statusCode: status,
      message: message,
    });
  }
}