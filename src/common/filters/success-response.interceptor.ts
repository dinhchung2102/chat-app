import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';

interface ResponseData {
  message?: string;
  [key: string]: unknown;
}

interface SuccessResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: unknown;
  timestamp: string;
  path: string;
}

@Injectable()
export class SuccessResponseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    return next.handle().pipe(
      map((data: ResponseData) => {
        const message = data?.message || 'Thành công';
        const responseData: Record<string, unknown> = { ...data };
        delete responseData.message;

        return {
          success: true,
          statusCode: response.statusCode,
          message,
          data: Object.keys(responseData).length > 0 ? responseData : null,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}
