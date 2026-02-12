import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, cleanupTestData, TEST_PREFIX } from './setup-e2e';
import { getTeamToken } from './helpers/test.helper';

describe('Auth 모듈 (E2E)', () => {
    let app: INestApplication;
    const teamName = `${TEST_PREFIX}auth_team`;
    const teamPassword = 'test1234';

    beforeAll(async () => {
        app = await createTestApp();
        // 테스트용 팀 미리 등록
        await request(app.getHttpServer())
            .post('/auth/register')
            .send({ name: teamName, password: teamPassword });
    });

    afterAll(async () => {
        await cleanupTestData(app);
        await app.close();
    });

    // ─── 팀 등록 ──────────────────────────────
    describe('POST /auth/register', () => {
        it('A-1: 팀 등록 성공', async () => {
            const name = `${TEST_PREFIX}register_new`;
            const res = await request(app.getHttpServer())
                .post('/auth/register')
                .send({ name, password: '1234' });

            expect(res.status).toBe(201);
            const data = res.body.data ?? res.body;
            expect(data).toHaveProperty('id');
            expect(data.name).toBe(name);
        });

        it('A-2: 중복 팀명 등록 시 409', async () => {
            const res = await request(app.getHttpServer())
                .post('/auth/register')
                .send({ name: teamName, password: '1234' });

            expect(res.status).toBe(409);
        });

        it('A-10: 빈 문자열 name 전송 시 400', async () => {
            const res = await request(app.getHttpServer())
                .post('/auth/register')
                .send({ name: '', password: '1234' });

            expect(res.status).toBe(400);
        });

        it('A-11: 빈 문자열 password 전송 시 400', async () => {
            const res = await request(app.getHttpServer())
                .post('/auth/register')
                .send({ name: `${TEST_PREFIX}empty_pw`, password: '' });

            expect(res.status).toBe(400);
        });
    });

    // ─── 팀 인증 (verify) ──────────────────────
    describe('POST /auth/verify', () => {
        it('A-3: 기존 팀 + 올바른 비번 → 200 + isNewTeam: false', async () => {
            const res = await request(app.getHttpServer())
                .post('/auth/verify')
                .send({ name: teamName, password: teamPassword });

            expect([200, 201]).toContain(res.status);
            const data = res.body.data ?? res.body;
            expect(data).toHaveProperty('access_token');
            expect(data.isNewTeam).toBe(false);
        });

        it('A-4: 기존 팀 + 틀린 비번 verify→ 401', async () => {
            const res = await request(app.getHttpServer())
                .post('/auth/verify')
                .send({ name: teamName, password: 'wrong' });

            expect(res.status).toBe(401);
        });

        it('A-5: 미등록 팀 + autoRegister: true → 200 + isNewTeam: true', async () => {
            const newName = `${TEST_PREFIX}auto_reg`;
            const res = await request(app.getHttpServer())
                .post('/auth/verify')
                .send({ name: newName, password: '5678', autoRegister: true });

            expect([200, 201]).toContain(res.status);
            const data = res.body.data ?? res.body;
            expect(data).toHaveProperty('access_token');
            expect(data.isNewTeam).toBe(true);
        });

        it('A-6: 미등록 팀 + autoRegister: false → 401', async () => {
            const res = await request(app.getHttpServer())
                .post('/auth/verify')
                .send({ name: `${TEST_PREFIX}not_exist`, password: '1234', autoRegister: false });

            expect(res.status).toBe(401);
        });

        it('A-7: 미등록 팀 + autoRegister 생략 → 401 (기본 false)', async () => {
            const res = await request(app.getHttpServer())
                .post('/auth/verify')
                .send({ name: `${TEST_PREFIX}no_flag`, password: '1234' });

            expect(res.status).toBe(401);
        });

        it('A-8: 기존 팀명 + autoRegister: true + 맞는 비번 → 200 (기존 팀 인증)', async () => {
            const res = await request(app.getHttpServer())
                .post('/auth/verify')
                .send({ name: teamName, password: teamPassword, autoRegister: true });

            expect([200, 201]).toContain(res.status);
            const data = res.body.data ?? res.body;
            expect(data.isNewTeam).toBe(false);
        });

        it('A-9: 기존 팀명 + autoRegister: true + 틀린 비번 → 401', async () => {
            const res = await request(app.getHttpServer())
                .post('/auth/verify')
                .send({ name: teamName, password: 'wrong', autoRegister: true });

            expect(res.status).toBe(401);
        });

        it('A-12: verify 토큰으로 인증 API 접근 성공', async () => {
            const token = await getTeamToken(app, teamName, teamPassword);

            const res = await request(app.getHttpServer())
                .get('/teams/me')
                .set('Authorization', `Bearer ${token}`);

            expect([200, 201]).toContain(res.status);
        });
    });
});
