import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanupTestData, createTestApp, TEST_PREFIX } from './setup-e2e';
import { createTestTeam } from './helpers/test.helper';

interface Body<T> {
  data: T;
}
interface Room {
  slug: string;
  title: string;
  headcount: number | null;
  startDate: string;
  endDate: string;
  ended: boolean;
  participants: { id: string; name: string; slots: number[] }[];
}
interface Entered {
  token: string;
  participant: { id: string; name: string; slots: number[] };
}

// 방 제목은 15자 제한이라 접두사 뒤는 8자 이내
describe('Jam 모듈 (E2E)', () => {
  let app: INestApplication;
  const http = () =>
    request(app.getHttpServer() as Parameters<typeof request>[0]);

  const createRoom = async (suffix: string, headcount: number | null) => {
    const res = await http()
      .post('/jam-rooms')
      .send({ title: `${TEST_PREFIX}${suffix}`, headcount, range: 'both' });
    expect(res.status).toBe(201);
    return (res.body as Body<{ slug: string }>).data.slug;
  };
  const enter = (slug: string, name: string, pin: string) =>
    http().post(`/jam-rooms/${slug}/participants`).send({ name, pin });

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    if (app) {
      await cleanupTestData(app);
      await app.close();
    }
  });

  it('J-1: 방 만들기 → 들어오기 → 칸 저장 → 조회', async () => {
    const slug = await createRoom('jam1', 1);
    expect(slug).toMatch(/^[A-Za-z0-9]{12}$/);

    const entered = await enter(slug, 'Kim', '1234');
    expect(entered.status).toBe(201);
    const { token, participant } = (entered.body as Body<Entered>).data;
    expect(participant.slots).toHaveLength(14);

    const slots = participant.slots.map((_, i) => (i === 2 ? 1984 : 0));
    const saved = await http()
      .put(`/jam-rooms/${slug}/participants/me/slots`)
      .set('X-Jam-Token', token)
      .send({ slots });
    expect(saved.status).toBe(200);

    const got = await http().get(`/jam-rooms/${slug}`);
    expect(got.status).toBe(200);
    const room = (got.body as Body<Room>).data;
    expect(room).toMatchObject({
      slug,
      title: `${TEST_PREFIX}jam1`,
      headcount: 1,
      ended: false,
      participants: [{ id: participant.id, name: 'Kim', slots }],
    });
    expect(room.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(room.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  describe('들어오기·바꾸기·빠지기', () => {
    let slug: string;
    let kimToken: string;

    beforeAll(async () => {
      slug = await createRoom('jam2', 1);
      kimToken = ((await enter(slug, 'Kim', '1234')).body as Body<Entered>).data
        .token;
    });

    it('J-2: 있는 이름(대소문자 무시) + 틀린 비밀번호 → 401', async () => {
      const res = await enter(slug, 'KIM', '0000');
      expect(res.status).toBe(401);
    });

    it('J-3: 이름 규칙 위반 → 400', async () => {
      expect((await enter(slug, 'ㅋㅋ', '1234')).status).toBe(400);
      expect((await enter(slug, 'Kim Lee', '1234')).status).toBe(400);
      expect((await enter(slug, 'Lee', '12a4')).status).toBe(400);
    });

    it('J-4: 인원을 넘어 들어오면 인원이 같이 올라감', async () => {
      expect((await enter(slug, 'Lee', '5678')).status).toBe(201);
      const room = ((await http().get(`/jam-rooms/${slug}`)).body as Body<Room>)
        .data;
      expect(room.headcount).toBe(2);
    });

    it('J-5: 참여자 수보다 적은 인원 → 400, 제목만 바꾸면 인원 그대로', async () => {
      const low = await http()
        .patch(`/jam-rooms/${slug}`)
        .set('X-Jam-Token', kimToken)
        .send({ headcount: 1 });
      expect(low.status).toBe(400);

      const res = await http()
        .patch(`/jam-rooms/${slug}`)
        .set('X-Jam-Token', kimToken)
        .send({ title: `${TEST_PREFIX}jam2b` });
      expect(res.status).toBe(200);
      expect((res.body as Body<Room>).data).toMatchObject({
        title: `${TEST_PREFIX}jam2b`,
        headcount: 2,
      });
    });

    it('J-6: 출입증 없음 401, 다른 방 출입증 403', async () => {
      const noToken = await http()
        .patch(`/jam-rooms/${slug}`)
        .send({ headcount: null });
      expect(noToken.status).toBe(401);

      const other = await createRoom('jam3', null);
      const otherToken = (
        (await enter(other, 'Park', '1234')).body as Body<Entered>
      ).data.token;
      const res = await http()
        .patch(`/jam-rooms/${slug}`)
        .set('X-Jam-Token', otherToken)
        .send({ headcount: null });
      expect(res.status).toBe(403);
    });

    it('J-7: 팀 출입증으로 방 API → 401', async () => {
      const { token: teamToken } = await createTestTeam(app, 'jam_team');
      const asHeader = await http()
        .put(`/jam-rooms/${slug}/participants/me/slots`)
        .set('X-Jam-Token', teamToken)
        .send({ slots: new Array<number>(14).fill(0) });
      expect(asHeader.status).toBe(401);

      const asBearer = await http()
        .put(`/jam-rooms/${slug}/participants/me/slots`)
        .set('Authorization', `Bearer ${teamToken}`)
        .send({ slots: new Array<number>(14).fill(0) });
      expect(asBearer.status).toBe(401);
    });

    it('J-8: 방 출입증으로 팀 API → 401', async () => {
      const res = await http()
        .get('/teams/me')
        .set('Authorization', `Bearer ${kimToken}`);
      expect(res.status).toBe(401);
    });

    it('J-9: 칸 길이가 기간 일수와 다르면 400', async () => {
      const res = await http()
        .put(`/jam-rooms/${slug}/participants/me/slots`)
        .set('X-Jam-Token', kimToken)
        .send({ slots: [0, 0, 0] });
      expect(res.status).toBe(400);
    });

    it('J-10: 빠지면 그 출입증은 401', async () => {
      const left = await http()
        .delete(`/jam-rooms/${slug}/participants/me`)
        .set('X-Jam-Token', kimToken);
      expect(left.status).toBe(200);

      const after = await http()
        .delete(`/jam-rooms/${slug}/participants/me`)
        .set('X-Jam-Token', kimToken);
      expect(after.status).toBe(401);
    });
  });

  it('J-11: 없는 방 → 404, 제목 16자 → 400', async () => {
    expect((await http().get('/jam-rooms/nonexistent00')).status).toBe(404);
    const res = await http()
      .post('/jam-rooms')
      .send({
        title: `${TEST_PREFIX}123456789`,
        headcount: null,
        range: 'this',
      });
    expect(res.status).toBe(400);
  });
});
