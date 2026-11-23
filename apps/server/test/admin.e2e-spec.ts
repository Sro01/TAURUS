import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, cleanupTestData, TEST_PREFIX } from './setup-e2e';
import { getAdminToken, createTestTeam, getFutureTimeSlot } from './helpers/test.helper';
import { PrismaService } from '../src/prisma/prisma.service';
import dayjs from '../src/common/utils/dayjs';

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
        const post = (body: object) =>
            request(app.getHttpServer())
                .post('/admin/reservations')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(body);

        it('AD-6: 여러 칸을 한 번에 → 모두 CONFIRMED_ADMIN', async () => {
            const startTimes = [getFutureTimeSlot(1, 20), getFutureTimeSlot(1, 21)];
            const res = await post({ startTimes, description: '테스트 메모' });

            if (res.status === 201) {
                const data = res.body.data ?? res.body;
                expect(data.created).toHaveLength(2);
                expect(data.skipped).toEqual([]);
                for (const r of data.created) {
                    expect(r.status).toBe('CONFIRMED_ADMIN');
                    expect(r.teamName).toBe('관리자');
                    expect(r.description).toBe('테스트 메모');
                }
                expect(data.created.map((r: { startTime: string }) => r.startTime)).toEqual(startTimes);
            } else {
                // 해당 날짜 주차가 없을 수 있음
                expect(res.status).toBe(404);
            }
        });

        it('AD-21: 이미 관리자 예약이 있는 칸은 건너뛰고 나머지만 잡음', async () => {
            const taken = getFutureTimeSlot(2, 9);
            const fresh = getFutureTimeSlot(2, 10);
            const firstRes = await post({ startTimes: [taken], description: '먼저 잡은 칸' });
            if (firstRes.status !== 201) {
                expect(firstRes.status).toBe(404);
                return;
            }

            const res = await post({ startTimes: [taken, fresh], description: '나중 칸' });
            expect(res.status).toBe(201);
            const data = res.body.data ?? res.body;
            expect(data.created).toHaveLength(1);
            expect(data.created[0].startTime).toBe(fresh);
            expect(data.skipped).toEqual([{ startTime: taken, description: '먼저 잡은 칸' }]);
        });

        it('AD-17: 같은 시각을 여러 번 보내면 한 칸만 잡음', async () => {
            const t = getFutureTimeSlot(2, 13);
            const res = await post({ startTimes: [t, t] });
            if (res.status === 201) {
                const data = res.body.data ?? res.body;
                expect(data.created).toHaveLength(1);
            } else {
                expect(res.status).toBe(404);
            }
        });

        it('AD-18: 팀 예약이 있는 칸은 취소하고 관리자 예약으로 덮어씀', async () => {
            const t = getFutureTimeSlot(1, 12);
            const { token: teamToken } = await createTestTeam(app, 'admin_overwrite');
            const teamRes = await request(app.getHttpServer())
                .post('/reservations/instant')
                .set('Authorization', `Bearer ${teamToken}`)
                .send({ startTime: t });
            if (teamRes.status !== 201) return; // 바로 예약 가능한 주차가 아님

            const res = await post({ startTimes: [t], description: '덮어쓰기' });
            expect(res.status).toBe(201);

            const prisma = app.get(PrismaService);
            const teamReservation = await prisma.reservation.findUnique({
                where: { id: (teamRes.body.data ?? teamRes.body).id },
            });
            expect(teamReservation?.status).toBe('CANCELLED');
        });

        it('AD-19: 정시가 아니거나 09~22시 밖이면 400, 아무것도 잡지 않음', async () => {
            const ok = getFutureTimeSlot(3, 15);
            const early = getFutureTimeSlot(3, 8);
            const halfPast = dayjs(getFutureTimeSlot(3, 16)).add(30, 'minute').format();

            for (const bad of [early, halfPast]) {
                const res = await post({ startTimes: [ok, bad] });
                expect(res.status).toBe(400);
            }

            const prisma = app.get(PrismaService);
            const count = await prisma.reservation.count({
                where: { startTime: new Date(ok), status: 'CONFIRMED_ADMIN' },
            });
            expect(count).toBe(0);
        });

        it('AD-20: 빈 배열 → 400', async () => {
            const res = await post({ startTimes: [] });
            expect(res.status).toBe(400);
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
                .send({ startTime: getFutureTimeSlot(1, 17) });

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
                .send({ startTime: getFutureTimeSlot(1, 10) });

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
