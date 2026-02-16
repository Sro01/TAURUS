import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, cleanupTestData } from './setup-e2e';
import { getTeamToken } from './helpers/test.helper';

describe('Week 모듈 (E2E)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await createTestApp();
    });

    afterAll(async () => {
        if (app) {
            await cleanupTestData(app);
            await app.close();
        }
    });

    describe('GET /weeks/main', () => {
        it('W-1: 메인 주차 조회 성공', async () => {
            const res = await request(app.getHttpServer()).get('/weeks/main');
            expect(res.status).toBe(200);
        });
    });

    describe('GET /weeks', () => {
        it('W-2: 전체 주차 목록 조회', async () => {
            const res = await request(app.getHttpServer()).get('/weeks');
            expect(res.status).toBe(200);
            const data = res.body.data ?? res.body;
            expect(Array.isArray(data)).toBe(true);
        });
    });

    describe('POST /weeks/rotation', () => {
        it('W-4: 인증 없이 주차 전환 시 401', async () => {
            const res = await request(app.getHttpServer()).post('/weeks/rotation');
            expect(res.status).toBe(401);
        });

        // W-3, W-5는 실제 주차 상태를 변경하므로 별도 제어 필요
        // 테스트 환경에서는 rotation 후 상태 복구가 어려우므로 주석 처리
        // 필요시 별도 테스트 DB에서 실행
    });
});
