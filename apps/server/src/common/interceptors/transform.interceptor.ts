import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CommonResponseDto } from '../dto/common-response.dto';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, CommonResponseDto<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<CommonResponseDto<T>> {
        return next.handle().pipe(
            map((data) => {
                // 이미 표준 포맷인 경우 (예: 페이지네이션 등 처리된 경우)
                if (data && data.code && data.data) {
                    return data;
                }

                return {
                    code: 'SUCCESS',
                    message: '요청이 성공적으로 처리되었습니다.',
                    data: data || null,
                };
            }),
        );
    }
}
