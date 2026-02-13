import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

// 테스트 데이터 prefix — 실제 데이터와 구분
export const TEST_PREFIX = '__test_';

/**
 * E2E 테스트용 NestJS 앱 초기화
 * - ValidationPipe 적용 (실제 서버와 동일한 환경)
 */
export async function createTestApp(): Promise<INestApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication();

    // 실제 main.ts와 동일한 파이프 설정
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );
    // 실제 응답 포맷과 동일하게 Interceptor 적용
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
    return app;
}

/**
 * 테스트 데이터 정리
 * - __test_ prefix가 붙은 팀과 관련 예약 삭제
 */
export async function cleanupTestData(app: INestApplication) {
    const prisma = app.get(PrismaService);

    // 테스트 팀의 예약 먼저 삭제 (FK 제약)
    await prisma.reservation.deleteMany({
        where: {
            team: { name: { startsWith: TEST_PREFIX } },
        },
    });

    // teamId가 null인 테스트 예약 삭제 (관리자 예약)
    // startTime 기준으로 오늘 이후 + CONFIRMED_ADMIN만 삭제 (안전장치)
    await prisma.reservation.deleteMany({
        where: {
            teamId: null,
            status: 'CONFIRMED_ADMIN',
        },
    });

    // 테스트 팀 삭제
    await prisma.team.deleteMany({
        where: { name: { startsWith: TEST_PREFIX } },
    });
}
