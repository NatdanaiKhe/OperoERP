import {
  ExceptionFilter,
  Catch,
  HttpException,
  Logger,
  ArgumentsHost,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const excResp = exception.getResponse();
      const normalized: Record<string, unknown> = {
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      };

      if (typeof excResp === 'object' && excResp !== null) {
        if ('message' in excResp) {
          normalized['message'] = (excResp as Record<string, unknown>).message;
        }
        if ('error' in excResp) {
          normalized['error'] = (excResp as Record<string, unknown>).error;
        }
      } else if (typeof excResp === 'string') {
        normalized['message'] = excResp;
      }

      if (status >= 500) {
        this.logger.error(
          `HTTP ${status} ${request.method} ${request.url}`,
          exception.stack,
        );
      } else {
        this.logger.warn(
          `HTTP ${status} ${request.method} ${request.url} - ${normalized['message']}`,
        );
      }

      response.status(status).json(normalized);
    } else {
      const err = exception as Error;
      this.logger.error(
        `Unhandled exception: ${err?.message ?? 'Unknown error'} ${request.method} ${request.url}`,
        err?.stack,
      );

      response.status(500).json({
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }
}
