import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, cleanupTestData, TEST_PREFIX } from './setup-e2e';
import { getTeamToken, createTestTeam } from './helpers/test.helper';
import { TeamSearchResult } from '../src/team/dto/search-team.dto';

describe('Team 모듈 (E2E)', () => {
    let app: INestApplication;
    let teamToken: string;
    const teamName = `${TEST_PREFIX}team_main`;
    const teamPassword = 'team1234';

    beforeAll(async () => {
        app = await createTestApp();
        // 테스트 팀 생성
        await request(app.getHttpServer())
            .post('/auth/register')
            .send({ name: teamName, password: teamPassword });
        teamToken = await getTeamToken(app, teamName, teamPassword);
    });

    afterAll(async () => {
        await cleanupTestData(app);
        await app.close();
    });

    // ─── 팀 목록 조회 ─────────────────────────
    describe('GET /teams', () => {
        it('T-1: 전체 팀 목록 조회', async () => {
            const res = await request(app.getHttpServer()).get('/teams');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data ?? res.body)).toBe(true);
        });

        it('T-2: 팀 이름 검색', async () => {
            const res = await request(app.getHttpServer())
                .get('/teams')
                .query({ search: TEST_PREFIX });
            expect(res.status).toBe(200);
            const data = res.body.data ?? res.body;
            expect(data.length).toBeGreaterThan(0);
        });

        it('T-3: 없는 검색어 → 빈 배열', async () => {
            const res = await request(app.getHttpServer())
                .get('/teams')
                .query({ search: '절대없는검색어12345' });
            expect(res.status).toBe(200);
            const data = res.body.data ?? res.body;
            expect(data.length).toBe(0);
        });
    });

  // ─── 팀 이름 검색 ─────────────────────────
  describe('GET /teams/search', () => {
    const search = async (q: string) => {
      const res = await request(app.getHttpServer())
        .get('/teams/search')
        .query({ q });
      const body = res.body as { data: TeamSearchResult };
      return { status: res.status, data: body.data };
    };

    it('T-18: 표기만 다른 입력 → exact, 더 긴 입력 → matches (출입증 없이)', async () => {
      const same = await search(`${TEST_PREFIX}TEAM-MAIN`);
      expect(same.status).toBe(200);
      expect(same.data.problem).toBeNull();
      expect(same.data.exact).toMatchObject({ name: teamName });
      expect(same.data.matches[0]).toMatchObject({ name: teamName });

      const longer = await search(`${TEST_PREFIX}team main 2`);
      expect(longer.status).toBe(200);
      expect(longer.data.exact).toBeNull();
      expect(longer.data.matches).toContainEqual(
        expect.objectContaining({ name: teamName }),
      );
    });
  });

    // ─── 내 정보 ──────────────────────────────
    describe('GET /teams/me', () => {
        it('T-4: 내 팀 정보 조회', async () => {
            const res = await request(app.getHttpServer())
                .get('/teams/me')
                .set('Authorization', `Bearer ${teamToken}`);
            expect(res.status).toBe(200);
            const data = res.body.data ?? res.body;
            expect(data.name).toBe(teamName);
        });

        it('T-10: 인증 없이 접근 시 401', async () => {
            const res = await request(app.getHttpServer()).get('/teams/me');
            expect(res.status).toBe(401);
        });
    });

    // ─── 팀명 변경 ────────────────────────────
    describe('PATCH /teams/me/name', () => {
        it('T-5: 팀명 변경 성공', async () => {
            const newName = `${TEST_PREFIX}team_renamed`;
            const res = await request(app.getHttpServer())
                .patch('/teams/me/name')
                .set('Authorization', `Bearer ${teamToken}`)
                .send({ name: newName });
            expect(res.status).toBe(200);

            // 원래 이름으로 복구
            await request(app.getHttpServer())
                .patch('/teams/me/name')
                .set('Authorization', `Bearer ${teamToken}`)
                .send({ name: teamName });
        });

        it('T-6: 중복 팀명으로 변경 시 409', async () => {
            // 다른 팀 생성
            const { name: otherName } = await createTestTeam(app, 'dup_name');

            const res = await request(app.getHttpServer())
                .patch('/teams/me/name')
                .set('Authorization', `Bearer ${teamToken}`)
                .send({ name: otherName });
            expect(res.status).toBe(409);
        });

        it('T-16: 다른 팀과 대소문자·특수문자만 다른 팀명으로 변경 시 409', async () => {
            const res = await request(app.getHttpServer())
                .patch('/teams/me/name')
                .set('Authorization', `Bearer ${teamToken}`)
                .send({ name: `${TEST_PREFIX}DUP-NAME` });
            expect(res.status).toBe(409);
        });

        it('T-17: 한글 자음·모음이 따로 들어간 팀명으로 변경 시 400', async () => {
            const res = await request(app.getHttpServer())
                .patch('/teams/me/name')
                .set('Authorization', `Bearer ${teamToken}`)
                .send({ name: `${TEST_PREFIX}밴드ㅋ` });
            expect(res.status).toBe(400);
        });

        it('T-11: 인증 없이 팀명 변경 시 401', async () => {
            const res = await request(app.getHttpServer())
                .patch('/teams/me/name')
                .send({ name: 'newname' });
            expect(res.status).toBe(401);
        });
    });

    // ─── 비밀번호 변경 ────────────────────────
    describe('PATCH /teams/me/password', () => {
        it('T-7, T-12, T-13: 비밀번호 변경 성공 → 기존 비번 실패 → 새 비번 성공', async () => {
            // 비밀번호 변경 전용 팀 생성
            const pwName = `${TEST_PREFIX}team_pw_change`;
            const pwPassword = 'pass1234';
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({ name: pwName, password: pwPassword });
            const pwToken = await getTeamToken(app, pwName, pwPassword);

            // T-7: 비밀번호 변경 성공
            const res = await request(app.getHttpServer())
                .patch('/teams/me/password')
                .set('Authorization', `Bearer ${pwToken}`)
                .send({ currentPassword: pwPassword, password: 'newPass1234' });
            expect(res.status).toBe(200);

            // T-12: 기존 비번으로 verify 실패
            const verifyOld = await request(app.getHttpServer())
                .post('/auth/verify')
                .send({ name: pwName, password: pwPassword });
            expect(verifyOld.status).toBe(401);

            // T-13: 새 비번으로 verify 성공
            const verifyNew = await request(app.getHttpServer())
                .post('/auth/verify')
                .send({ name: pwName, password: 'newPass1234' });
            expect([200, 201]).toContain(verifyNew.status);
        });

        it('T-8: 현재 비밀번호 틀림 → 401', async () => {
            // 전용 팀 생성
            const pwName2 = `${TEST_PREFIX}team_pw_wrong`;
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({ name: pwName2, password: 'pass1234' });
            const pwToken2 = await getTeamToken(app, pwName2, 'pass1234');

            const res = await request(app.getHttpServer())
                .patch('/teams/me/password')
                .set('Authorization', `Bearer ${pwToken2}`)
                .send({ currentPassword: 'wrongpw1', password: 'newPass1234' });
            expect(res.status).toBe(401);
        });
    });

    // ─── 팀 탈퇴 ──────────────────────────────
    describe('DELETE /teams/me', () => {
        it('T-9, T-14, T-15: 팀 탈퇴 → 토큰 무효 → 같은 이름 재등록', async () => {
            // 탈퇴용 팀 생성
            const delName = `${TEST_PREFIX}team_delete`;
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({ name: delName, password: '1234' });
            const delToken = await getTeamToken(app, delName, '1234');

            // T-9: 팀 탈퇴
            const delRes = await request(app.getHttpServer())
                .delete('/teams/me')
                .set('Authorization', `Bearer ${delToken}`);
            expect(delRes.status).toBe(200);

            // T-14: 탈퇴 후 토큰으로 API 접근 불가
            const afterRes = await request(app.getHttpServer())
                .get('/teams/me')
                .set('Authorization', `Bearer ${delToken}`);
            expect([401, 404]).toContain(afterRes.status);

            // T-15: 같은 이름으로 재등록 가능
            const reReg = await request(app.getHttpServer())
                .post('/auth/register')
                .send({ name: delName, password: '5678' });
            expect(reReg.status).toBe(201);
        });
    });
});
