import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, cleanupTestData, TEST_PREFIX } from './setup-e2e';
import { getAdminToken, createTestTeam, getFutureSlotTime } from './helpers/test.helper';

describe('Admin 모듈 (E2E)', () => {
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

    // ─── 관리자 인증 ─────────────────────────
    describe('POST /admin/verify', () => {
        it('AD-1: 올바른 마스터 비번 → 200 + token', async () => {
            const res = await request(app.getHttpServer())
                .post('/admin/verify')
                .send({ password: process.env.ADMIN_PASSWORD || 'super-admin-key' });
            expect([200, 201]).toContain(res.status);
            const data = res.body.data ?? res.body;
            expect(data).toHaveProperty('access_token');
        });

        it('AD-2: 틀린 마스터 비번 → 401', async () => {
            const res = await request(app.getHttpServer())
                .post('/admin/verify')
                .send({ password: 'wrong-password' });
            expect(res.status).toBe(401);
        });
    });

    // ─── 설정 관리 ───────────────────────────
    describe('설정 (GET/PATCH /admin/settings)', () => {
        it('AD-3: 설정 조회', async () => {
            const res = await request(app.getHttpServer())
                .get('/admin/settings')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
        });

        it('AD-4: MaxSlotsPerWeek 변경', async () => {
            const res = await request(app.getHttpServer())
                .patch('/admin/settings')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ maxSlotsPerWeek: 3, maxSlotsPerDay: 1 });
            expect(res.status).toBe(200);

            // 원래 값으로 복원
            await request(app.getHttpServer())
                .patch('/admin/settings')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ maxSlotsPerWeek: 2, maxSlotsPerDay: 1 });
        });

        it('AD-13: 인증 없이 관리자 API → 401', async () => {
            const res = await request(app.getHttpServer())
                .get('/admin/settings');
            expect(res.status).toBe(401);
        });

        it('AD-14: 팀 토큰으로 관리자 API → 403', async () => {
            const { token: teamToken } = await createTestTeam(app, 'admin_reject');
            const res = await request(app.getHttpServer())
                .get('/admin/settings')
                .set('Authorization', `Bearer ${teamToken}`);
            expect(res.status).toBe(403);
        });
    });

    // ─── 관리자 우선 예약 ─────────────────────
    describe('POST /admin/reservations', () => {
        it('AD-6: 관리자 우선 예약 생성 → CONFIRMED_ADMIN', async () => {
            const res = await request(app.getHttpServer())
                .post('/admin/reservations')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ startTime: getFutureSlotTime(1, 20), description: '테스트 메모' });

            if (res.status === 201) {
                const data = res.body.data ?? res.body;
                expect(data.status).toBe('CONFIRMED_ADMIN');
                expect(data.teamName).toBe('관리자');
                expect(data.description).toBe('테스트 메모');
            } else {
                // OPEN 주차가 없을 수 있음
                expect([400, 404]).toContain(res.status);
            }
        });
    });

    // ─── 예약 강제 취소 ───────────────────────
    describe('DELETE /admin/reservations/:id', () => {
        it('AD-9: 예약 강제 취소', async () => {
            // 먼저 팀 예약 생성
            const { token: teamToken } = await createTestTeam(app, 'admin_cancel');
            const create = await request(app.getHttpServer())
                .post('/reservations/instant')
                .set('Authorization', `Bearer ${teamToken}`)
                .send({ startTime: getFutureSlotTime(1, 17) });

            if (create.status === 201) {
                const id = (create.body.data ?? create.body).id;
                const cancel = await request(app.getHttpServer())
                    .delete(`/admin/reservations/${id}`)
                    .set('Authorization', `Bearer ${adminToken}`);
                expect(cancel.status).toBe(200);
            }
        });

        it('AD-11: 존재하지 않는 예약 취소 → 404', async () => {
            const res = await request(app.getHttpServer())
                .delete('/admin/reservations/nonexistent-id-99999')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(404);
        });
    });

    // ─── 팀 강제 삭제 ─────────────────────────
    describe('DELETE /admin/teams/:id', () => {
        it('AD-10: 팀 강제 삭제', async () => {
            // 삭제할 팀 생성
            const regRes = await request(app.getHttpServer())
                .post('/auth/register')
                .send({ name: `${TEST_PREFIX}admin_del_team`, password: '1234' });

            if (regRes.status === 201) {
                const teamId = (regRes.body.data ?? regRes.body).id;
                const del = await request(app.getHttpServer())
                    .delete(`/admin/teams/${teamId}`)
                    .set('Authorization', `Bearer ${adminToken}`);
                expect(del.status).toBe(200);
            }
        });

        it('AD-12: 존재하지 않는 팀 삭제 → 404', async () => {
            const res = await request(app.getHttpServer())
                .delete('/admin/teams/nonexistent-team-id-99999')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(404);
        });
    });

    // ─── 특정 팀 예약 조회 ─────────────────────
    describe('GET /admin/reservations/team/:teamId', () => {
        it('AD-15: 특정 팀의 예약 내역 조회', async () => {
            const { name, token } = await createTestTeam(app, 'team_res_lookup');

            // 예약 생성
            await request(app.getHttpServer())
                .post('/reservations/instant')
                .set('Authorization', `Bearer ${token}`)
                .send({ startTime: getFutureSlotTime(1, 10) });

            // 팀 ID 가져오기
            const teamRes = await request(app.getHttpServer())
                .get('/teams/me')
                .set('Authorization', `Bearer ${token}`);
            const teamId = (teamRes.body.data ?? teamRes.body).id;

            const res = await request(app.getHttpServer())
                .get(`/admin/reservations/team/${teamId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            const data = res.body.data ?? res.body;
            expect(Array.isArray(data)).toBe(true);
            expect(data.length).toBeGreaterThan(0);
            expect(data[0]).toHaveProperty('teamId', teamId);
        });

        it('AD-16: 존재하지 않는 팀 예약 조회 → 404', async () => {
            const res = await request(app.getHttpServer())
                .get('/admin/reservations/team/nonexistent-id')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(404);
        });
    });
});
