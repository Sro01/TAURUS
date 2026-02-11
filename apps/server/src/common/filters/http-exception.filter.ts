import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { CommonResponseDto } from '../dto/common-response.dto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal Server Error' };
    
    // NestJS 기본 에러 메시지 처리 (string 또는 object)
    let message = '오류가 발생했습니다.';
    let code = 'ERROR';

    if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        code = `HTTP_${status}`;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const body = exceptionResponse as any;
        message = body.message || message;
        code = body.error || `HTTP_${status}`;
        
        // validation pipe 에러 처리 (배열인 경우)
        if (Array.isArray(message)) {
            message = message[0];
        }
    }

    const errorResponse: CommonResponseDto<null> = {
      code: code.toUpperCase().replace(/\s+/g, '_'), // 공백을 언더바(_)로 변경
      message: message,
      data: null,
    };

    response.status(status).json(errorResponse);
  }
}
