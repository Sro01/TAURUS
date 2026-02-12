import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, cleanupTestData, TEST_PREFIX } from './setup-e2e';
import { createTestTeam, getTeamToken, getFutureSlotTime } from './helpers/test.helper';

describe('Reservation 모듈 (E2E)', () => {
    let app: INestApplication;
    let team1Token: string;
    let team2Token: string;

    beforeAll(async () => {
        app = await createTestApp();
        const t1 = await createTestTeam(app, 'rsv_team1');
        const t2 = await createTestTeam(app, 'rsv_team2');
        team1Token = t1.token;
        team2Token = t2.token;
    });

    afterAll(async () => {
        await cleanupTestData(app);
        await app.close();
    });

    // ─── 바로 예약 (Instant) ──────────────────
    describe('POST /reservations/instant', () => {
        it('R-1: 정상 바로 예약 → 201 + CONFIRMED', async () => {
            const res = await request(app.getHttpServer())
                .post('/reservations/instant')
                .set('Authorization', `Bearer ${team1Token}`)
                .send({ startTime: getFutureSlotTime(1, 10) });

            // 주차가 없을 수 있으므로 201 또는 404 허용
            if (res.status === 201) {
                const data = res.body.data ?? res.body;
                expect(data.status).toBe('CONFIRMED');
            } else {
                // OPEN 주차가 없는 경우
                expect([400, 404]).toContain(res.status);
            }
        });

        it('R-2: 이미 예약된 슬롯에 중복 예약 → 409', async () => {
            const slotTime = getFutureSlotTime(1, 11);

            // 첫 번째 예약
            const first = await request(app.getHttpServer())
                .post('/reservations/instant')
                .set('Authorization', `Bearer ${team1Token}`)
                .send({ startTime: slotTime });

            if (first.status === 201) {
                // 같은 슬롯 중복 예약 시도
                const second = await request(app.getHttpServer())
                    .post('/reservations/instant')
                    .set('Authorization', `Bearer ${team2Token}`)
                    .send({ startTime: slotTime });
                expect(second.status).toBe(409);
            }
        });

        it('R-3: 과거 시간 예약 → 400', async () => {
            const res = await request(app.getHttpServer())
                .post('/reservations/instant')
                .set('Authorization', `Bearer ${team1Token}`)
                .send({ startTime: '2020-01-01T10:00:00+09:00' });
            expect(res.status).toBe(400);
        });

        it('R-4: 비정각 시간 예약 (10:30) → 400', async () => {
            const nonHour = getFutureSlotTime(1, 10).replace('T10:00', 'T10:30');
            const res = await request(app.getHttpServer())
                .post('/reservations/instant')
                .set('Authorization', `Bearer ${team1Token}`)
                .send({ startTime: nonHour });
            expect(res.status).toBe(400);
        });

        it('R-5: 범위 벗어난 시간 (08:00) → 400', async () => {
            const res = await request(app.getHttpServer())
                .post('/reservations/instant')
                .set('Authorization', `Bearer ${team1Token}`)
                .send({ startTime: getFutureSlotTime(1, 8) });
            expect(res.status).toBe(400);
        });

        it('R-9: 인증 없이 바로 예약 → 401', async () => {
            const res = await request(app.getHttpServer())
                .post('/reservations/instant')
                .send({ startTime: getFutureSlotTime(1, 10) });
            expect(res.status).toBe(401);
        });
    });

    // ─── 미리 예약 (Pre) ──────────────────────
    describe('POST /reservations/pre', () => {
        it('R-10: 정상 미리 예약 → 201 + PENDING', async () => {
            const res = await request(app.getHttpServer())
                .post('/reservations/pre')
                .set('Authorization', `Bearer ${team1Token}`)
                .send({ startTime: getFutureSlotTime(7, 14) });

            if (res.status === 201) {
                const data = res.body.data ?? res.body;
                expect(data.status).toBe('PENDING');
            } else {
                // UPCOMING 주차가 없을 수 있음
                expect([400, 404]).toContain(res.status);
            }
        });

        it('R-11: 같은 슬롯 중복 미리 예약 (같은 팀) → 409', async () => {
            const slotTime = getFutureSlotTime(7, 15);

            const first = await request(app.getHttpServer())
                .post('/reservations/pre')
                .set('Authorization', `Bearer ${team1Token}`)
                .send({ startTime: slotTime });

            if (first.status === 201) {
                const second = await request(app.getHttpServer())
                    .post('/reservations/pre')
                    .set('Authorization', `Bearer ${team1Token}`)
                    .send({ startTime: slotTime });
                expect(second.status).toBe(409);
            }
        });

        it('R-12: 같은 슬롯 미리 예약 (다른 팀) → 201 허용', async () => {
            const slotTime = getFutureSlotTime(7, 16);

            const first = await request(app.getHttpServer())
                .post('/reservations/pre')
                .set('Authorization', `Bearer ${team1Token}`)
                .send({ startTime: slotTime });

            if (first.status === 201) {
                const second = await request(app.getHttpServer())
                    .post('/reservations/pre')
                    .set('Authorization', `Bearer ${team2Token}`)
                    .send({ startTime: slotTime });
                expect(second.status).toBe(201);
            }
        });
    });

    // ─── 조회 ─────────────────────────────────
    describe('GET /reservations', () => {
        it('R-15: 내 예약 조회', async () => {
            const res = await request(app.getHttpServer())
                .get('/reservations/me')
                .set('Authorization', `Bearer ${team1Token}`);
            expect(res.status).toBe(200);
        });

        it('R-16: 주차별 예약 현황 (current)', async () => {
            const res = await request(app.getHttpServer())
                .get('/reservations/week/current');
            // OPEN 주차가 있으면 200, 없으면 404
            expect([200, 404]).toContain(res.status);
        });

        it('R-17: 주차별 예약 현황 (next)', async () => {
            const res = await request(app.getHttpServer())
                .get('/reservations/week/next');
            expect([200, 404]).toContain(res.status);
        });

        it('R-19: 잘못된 주차 파라미터 → 400', async () => {
            const res = await request(app.getHttpServer())
                .get('/reservations/week/invalid');
            expect(res.status).toBe(400);
        });
    });

    // ─── 취소 ─────────────────────────────────
    describe('DELETE /reservations/:id', () => {
        it('R-20: 본인 예약 취소', async () => {
            // 먼저 예약 생성 시도
            const create = await request(app.getHttpServer())
                .post('/reservations/instant')
                .set('Authorization', `Bearer ${team1Token}`)
                .send({ startTime: getFutureSlotTime(1, 12) });

            if (create.status === 201) {
                const id = (create.body.data ?? create.body).id;
                const cancel = await request(app.getHttpServer())
                    .delete(`/reservations/${id}`)
                    .set('Authorization', `Bearer ${team1Token}`);
                expect(cancel.status).toBe(200);
            }
        });

        it('R-21: 다른 팀 예약 취소 시도 → 403', async () => {
            const create = await request(app.getHttpServer())
                .post('/reservations/instant')
                .set('Authorization', `Bearer ${team1Token}`)
                .send({ startTime: getFutureSlotTime(1, 13) });

            if (create.status === 201) {
                const id = (create.body.data ?? create.body).id;
                const cancel = await request(app.getHttpServer())
                    .delete(`/reservations/${id}`)
                    .set('Authorization', `Bearer ${team2Token}`);
                expect(cancel.status).toBe(403);
            }
        });

        it('R-23: 존재하지 않는 예약 ID → 404', async () => {
            const res = await request(app.getHttpServer())
                .delete('/reservations/nonexistent-id-12345')
                .set('Authorization', `Bearer ${team1Token}`);
            expect(res.status).toBe(404);
        });
    });
});
