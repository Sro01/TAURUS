import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Admin Role Guard
 * JWT 인증 후 payload.role이 'ADMIN'인지 확인
 * @AuthGuard('jwt') 뒤에 체이닝하여 사용
 */
@Injectable()
export class AdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || user.role !== 'ADMIN') {
            throw new ForbiddenException('관리자 권한이 필요합니다.');
        }

        return true;
    }
}
