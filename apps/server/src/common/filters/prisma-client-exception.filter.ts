
import { ArgumentsHost, Catch, ConflictException, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
    catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const message = exception.message.replace(/\n/g, '');

        switch (exception.code) {
            case 'P2002': {
                const status = HttpStatus.CONFLICT;
                response.status(status).json({
                    statusCode: status,
                    message: '이미 존재하는 데이터입니다.',
                    error: 'Conflict',
                });
                break;
            }
            case 'P2003': {
                const status = HttpStatus.BAD_REQUEST;
                response.status(status).json({
                    statusCode: status,
                    message: '유효하지 않은 참조입니다.',
                    error: 'Bad Request',
                });
                break;
            }
            case 'P2025': {
                const status = HttpStatus.NOT_FOUND;
                response.status(status).json({
                    statusCode: status,
                    message: '데이터를 찾을 수 없습니다.',
                    error: 'Not Found',
                });
                break;
            }
            default:
                // default 500 error code
                super.catch(exception, host);
                break;
        }
    }
}
