import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';

    // Nếu là HttpException (BadRequestException, NotFoundException, ...)
    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        message =
          typeof (exceptionResponse as any).message === 'string'
            ? (exceptionResponse as any).message
            : JSON.stringify((exceptionResponse as any).message);

        // Có thể lấy thêm custom errorCode nếu có
        if ('errorCode' in exceptionResponse) {
          errorCode = (exceptionResponse as any).errorCode;
        }
      }
    }

    // Có thể log lỗi tại đây nếu cần
    // logger.error({ status, message, path: request.url, exception });

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errorCode,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
