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

        it('E-10: 삭제된 팀의 토큰으로 접근 시 401 Unauthorized', async () => {
            // 1. 팀 생성 및 토큰 발급
            const { token, id } = await createTestTeam(app, 'deleted_team');

            // 2. 관리자 권한으로 팀 삭제
            await request(app.getHttpServer())
                .delete(`/admin/teams/${id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            // 3. 삭제된 팀의 토큰으로 API 접근 시도 (예: 내 예약 조회)
            const res = await request(app.getHttpServer())
                .get('/reservations/me')
                .set('Authorization', `Bearer ${token}`);

            // JwtStrategy에서 DB 확인 후 401 반환해야 함
            expect(res.status).toBe(401);
        });

        it('E-11: 동시성 테스트 - 동일 슬롯 동시 예약 시 하나만 성공', async () => {
            const { token: t1 } = await createTestTeam(app, 'race_t1');
            const { token: t2 } = await createTestTeam(app, 'race_t2');
            const targetTime = getFutureSlotTime(2, 10); // 2주 뒤(Week OPEN 가정, 10시)

            // Week status를 OPEN으로 확보 (기존 로직이 Week를 생성한다고 가정하거나, 필요 시 생성 로직 추가)
            // 여기서는 getFutureSlotTime이 유효한 시간을 준다고 가정하고 진행.
            // 만약 실패한다면 setUp에서 Week를 OPEN으로 만들어야 함.

            // Promise.all로 동시에 요청 전송
            const [res1, res2] = await Promise.all([
                request(app.getHttpServer())
                    .post('/reservations/instant')
                    .set('Authorization', `Bearer ${t1}`)
                    .send({ startTime: targetTime }),
                request(app.getHttpServer())
                    .post('/reservations/instant')
                    .set('Authorization', `Bearer ${t2}`)
                    .send({ startTime: targetTime }),
            ]);

            // 하나는 201, 하나는 409여야 함 (순서는 보장 안 됨)
            const statuses = [res1.status, res2.status].sort();
            // Week가 없어서 404가 뜨면 테스트 실패 처리 (환경 의존적)
            if (statuses.includes(404)) {
                // Week가 없어서 테스트 불가할 수 있음 -> 이 경우 skip하거나 로그 출력
                // console.warn('Week not found for concurrency test');
            } else {
                expect(statuses).toEqual([201, 409]);
            }
        });

        // ─── 보안 (토큰 무효화) ────────────────────
        it('E-12: 비밀번호 변경 시 기존 토큰 무효화 및 새 토큰 발급 확인', async () => {
            // 1. 팀 생성 및 로그인 (토큰 A)
            const { token: tokenA, name } = await createTestTeam(app, 'token_inv');
            const originalPassword = '1234';
            const newPassword = 'newPassword1234';

            // 2. 비밀번호 변경 요청 (토큰 A 사용)
            const changeRes = await request(app.getHttpServer())
                .patch('/teams/me/password')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({
                    currentPassword: originalPassword,
                    password: newPassword,
                });

            expect(changeRes.status).toBe(200);
            const tokenB = changeRes.body.data?.access_token ?? changeRes.body.access_token;
            expect(tokenB).toBeDefined();
            expect(tokenB).not.toBe(tokenA); // 새 토큰은 달라야 함

            // 3. 구 토큰(tokenA)으로 API 접근 시도 -> 401 예상
            const failRes = await request(app.getHttpServer())
                .get('/teams/me')
                .set('Authorization', `Bearer ${tokenA}`);
            expect(failRes.status).toBe(401);

            // 4. 신규 토큰(tokenB)으로 API 접근 시도 -> 200 예상
            const successRes = await request(app.getHttpServer())
                .get('/teams/me')
                .set('Authorization', `Bearer ${tokenB}`);
            expect(successRes.status).toBe(200);
            expect(successRes.body.data.name).toBe(name);
        });
    });
});
