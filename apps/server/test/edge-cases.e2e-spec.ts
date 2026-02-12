import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, cleanupTestData, TEST_PREFIX } from './setup-e2e';
import { getAdminToken, createTestTeam, getTeamToken, getFutureSlotTime } from './helpers/test.helper';

describe('교차 모듈 엣지 케이스 (E2E)', () => {
    let app: INestApplication;
    let adminToken: string;

    beforeAll(async () => {
        app = await createTestApp();
        adminToken = await getAdminToken(app);
    });

    afterAll(async () => {
        await cleanupTestData(app);
        await app.close();
    });

    // ─── 권한 충돌 ────────────────────────────
    describe('관리자 토큰으로 팀 전용 API 접근', () => {
        it('E-3: 관리자 토큰으로 GET /teams/me → 에러', async () => {
            const res = await request(app.getHttpServer())
                .get('/teams/me')
                .set('Authorization', `Bearer ${adminToken}`);
            // 관리자는 teamId가 없으므로 에러 반환
            expect([400, 404, 500]).toContain(res.status);
        });

        it('E-4: 관리자 토큰으로 PATCH /teams/me/name → 에러', async () => {
            const res = await request(app.getHttpServer())
                .patch('/teams/me/name')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'admin_changed' });
            expect([400, 404, 500]).toContain(res.status);
        });
    });

    // ─── 다중 팀 전환 ─────────────────────────
    describe('팀 전환 시 데이터 격리', () => {
        it('E-5, E-6: 팀1→팀2 전환 후 예약 격리 확인', async () => {
            const { token: token1 } = await createTestTeam(app, 'switch_t1');
            const { token: token2 } = await createTestTeam(app, 'switch_t2');

            // 팀1 예약 시도
            const r1 = await request(app.getHttpServer())
                .post('/reservations/instant')
                .set('Authorization', `Bearer ${token1}`)
                .send({ startTime: getFutureSlotTime(1, 18) });

            // 팀2 예약 시도 (다른 슬롯)
            const r2 = await request(app.getHttpServer())
                .post('/reservations/instant')
                .set('Authorization', `Bearer ${token2}`)
                .send({ startTime: getFutureSlotTime(1, 19) });

            // 예약이 성공한 경우에만 격리 검증
            if (r1.status === 201 && r2.status === 201) {
                // 팀1 예약 조회 — 팀1 것만 보여야 함
                const me1 = await request(app.getHttpServer())
                    .get('/reservations/me')
                    .set('Authorization', `Bearer ${token1}`);
                const data1 = me1.body.data ?? me1.body;
                expect(data1.every((r: any) => r.teamName !== `${TEST_PREFIX}switch_t2`)).toBe(true);

                // 팀2 예약 조회 — 팀2 것만 보여야 함
                const me2 = await request(app.getHttpServer())
                    .get('/reservations/me')
                    .set('Authorization', `Bearer ${token2}`);
                const data2 = me2.body.data ?? me2.body;
                expect(data2.every((r: any) => r.teamName !== `${TEST_PREFIX}switch_t1`)).toBe(true);
            }
        });
    });

    // ─── 데이터 무결성 ────────────────────────
    describe('데이터 무결성', () => {
        it('E-9: 설정 변경 후 즉시 반영 (MaxSlotsPerDay)', async () => {
            // maxSlotsPerDay를 1로 유지, maxSlotsPerWeek를 2로 설정
            await request(app.getHttpServer())
                .patch('/admin/settings')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ maxSlotsPerWeek: 2, maxSlotsPerDay: 1 });

            const { token } = await createTestTeam(app, 'limit_test');

            // 첫 번째 예약
            const r1 = await request(app.getHttpServer())
                .post('/reservations/instant')
                .set('Authorization', `Bearer ${token}`)
                .send({ startTime: getFutureSlotTime(1, 14) });

            if (r1.status === 201) {
                // 같은 날 두 번째 예약 → maxSlotsPerDay 제한 초과
                const r2 = await request(app.getHttpServer())
                    .post('/reservations/instant')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ startTime: getFutureSlotTime(1, 15) });
                // 일일 제한 또는 슬롯 중복으로 실패해야 함
                expect([400, 409]).toContain(r2.status);
            }

            // 제한 복구
            await request(app.getHttpServer())
                .patch('/admin/settings')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ maxSlotsPerWeek: 2, maxSlotsPerDay: 1 });
        });
    });
});
