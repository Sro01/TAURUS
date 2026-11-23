import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { JamParticipant, JamRoom, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import dayjs from '../common/utils/dayjs';
import { PrismaService } from '../prisma/prisma.service';
import { WeekService } from '../week/week.service';
import { fromDbDate, todayKst, toDbDate } from './jam-slots';
import { JamService } from './jam.service';
import { JamTokenService } from './jam-token.service';

// ─── 가짜 Prisma (메모리). 테스트가 쓰는 호출만 흉내 낸다 ───

interface Where {
  id?: string;
  slug?: string;
  roomId?: string;
  roomId_nameKey?: { roomId: string; nameKey: string };
}

function p2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('dup', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

function fakeJamPrisma() {
  const rooms: JamRoom[] = [];
  const parts: JamParticipant[] = [];
  let seq = 0;

  const findPart = (w: Where) =>
    parts.find((p) =>
      w.roomId_nameKey
        ? p.roomId === w.roomId_nameKey.roomId &&
          p.nameKey === w.roomId_nameKey.nameKey
        : p.id === w.id && (w.roomId === undefined || p.roomId === w.roomId),
    ) ?? null;

  const prisma = {
    rooms,
    parts,
    jamRoom: {
      findUnique: jest.fn(
        ({ where, include }: { where: Where; include?: unknown }) => {
          const room = rooms.find((r) =>
            where.slug !== undefined
              ? r.slug === where.slug
              : r.id === where.id,
          );
          if (!room || !include) return Promise.resolve(room ?? null);
          const participants = parts.filter((p) => p.roomId === room.id);
          return Promise.resolve({ ...room, participants });
        },
      ),
      create: jest.fn(({ data }: { data: Partial<JamRoom> }) => {
        if (rooms.some((r) => r.slug === data.slug)) {
          return Promise.reject(p2002());
        }
        const room = {
          id: `room-${++seq}`,
          headcount: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        } as JamRoom;
        rooms.push(room);
        return Promise.resolve(room);
      }),
      update: jest.fn(
        ({ where, data }: { where: Where; data: Partial<JamRoom> }) => {
          const room = rooms.find((r) => r.id === where.id)!;
          Object.assign(room, data);
          return Promise.resolve(room);
        },
      ),
      deleteMany: jest.fn(({ where }: { where: { endDate: { lt: Date } } }) => {
        const gone = rooms.filter((r) => r.endDate < where.endDate.lt);
        gone.forEach((r) => rooms.splice(rooms.indexOf(r), 1));
        return Promise.resolve({ count: gone.length });
      }),
    },
    jamParticipant: {
      findUnique: jest.fn(({ where }: { where: Where }) =>
        Promise.resolve(findPart(where)),
      ),
      findFirst: jest.fn(({ where }: { where: Where }) =>
        Promise.resolve(findPart(where)),
      ),
      create: jest.fn(({ data }: { data: Partial<JamParticipant> }) => {
        if (
          parts.some(
            (p) => p.roomId === data.roomId && p.nameKey === data.nameKey,
          )
        ) {
          return Promise.reject(p2002());
        }
        const p = {
          id: `p-${++seq}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        } as JamParticipant;
        parts.push(p);
        return Promise.resolve(p);
      }),
      count: jest.fn(({ where }: { where: Where }) =>
        Promise.resolve(parts.filter((p) => p.roomId === where.roomId).length),
      ),
      update: jest.fn(
        ({ where, data }: { where: Where; data: Partial<JamParticipant> }) => {
          const p = parts.find((x) => x.id === where.id)!;
          Object.assign(p, data);
          return Promise.resolve(p);
        },
      ),
      delete: jest.fn(({ where }: { where: Where }) => {
        const p = parts.find((x) => x.id === where.id)!;
        parts.splice(parts.indexOf(p), 1);
        return Promise.resolve(p);
      }),
    },
    $queryRaw: jest.fn(() => Promise.resolve([])),
  };
  // 트랜잭션은 같은 가짜를 그대로 넘긴다
  const $transaction = jest.fn((fn: (tx: typeof prisma) => Promise<unknown>) =>
    fn(prisma),
  );
  return Object.assign(prisma, { $transaction });
}

type FakeJamPrisma = ReturnType<typeof fakeJamPrisma>;

const MAIN_WEEKS = {
  main: {
    startDate: '2026-11-22T00:00:00+09:00',
    endDate: '2026-11-28T23:59:59+09:00',
  },
  next: {
    startDate: '2026-11-29T00:00:00+09:00',
    endDate: '2026-12-05T23:59:59+09:00',
  },
};

// 오늘 기준 n일 뒤 KST 날짜의 DB 값
const dbDay = (n: number) =>
  toDbDate(dayjs.tz(todayKst(), 'Asia/Seoul').add(n, 'day'));

describe('JamService', () => {
  let service: JamService;
  let tokens: JamTokenService;
  let prisma: FakeJamPrisma;
  let pinHash: string;

  beforeAll(async () => {
    pinHash = await bcrypt.hash('1234', 4);
  });

  beforeEach(async () => {
    prisma = fakeJamPrisma();
    const module = await Test.createTestingModule({
      providers: [
        JamService,
        JamTokenService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: WeekService,
          useValue: {
            getMainWeeks: jest.fn(() => Promise.resolve(MAIN_WEEKS)),
          },
        },
        { provide: JwtService, useValue: new JwtService({ secret: 'test' }) },
      ],
    }).compile();
    service = module.get(JamService);
    tokens = module.get(JamTokenService);
  });

  // 방 하나 + 참여자 넣기
  function seedRoom(
    opts: {
      endOffset?: number;
      headcount?: number | null;
      people?: string[];
    } = {},
  ): JamRoom {
    const room = {
      id: 'room-x',
      slug: 'slugslugslug',
      title: '합주',
      headcount: opts.headcount ?? null,
      startDate: dbDay((opts.endOffset ?? 3) - 6),
      endDate: dbDay(opts.endOffset ?? 3),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as JamRoom;
    prisma.rooms.push(room);
    for (const name of opts.people ?? []) {
      prisma.parts.push({
        id: `id-${name}`,
        roomId: room.id,
        name,
        nameKey: name.toLowerCase(),
        pinHash,
        slots: [0, 0, 0, 0, 0, 0, 0],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as JamParticipant);
    }
    return room;
  }

  const access = (name: string) => ({
    participantId: `id-${name}`,
    roomId: 'room-x',
  });

  describe('방 만들기 기간', () => {
    it.each([
      ['this', '2026-11-22', '2026-11-28'],
      ['next', '2026-11-29', '2026-12-05'],
      ['both', '2026-11-22', '2026-12-05'],
    ] as const)('%s → %s ~ %s', async (range, start, end) => {
      const { slug } = await service.createRoom({
        title: '합주',
        headcount: null,
        range,
      });
      expect(slug).toMatch(/^[A-Za-z0-9]{12}$/);
      const room = prisma.rooms[0];
      expect(fromDbDate(room.startDate)).toBe(start);
      expect(fromDbDate(room.endDate)).toBe(end);
    });

    it('slug가 겹치면 다시 만들고, 4번 모두 겹치면 409', async () => {
      prisma.jamRoom.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      await service.createRoom({ title: 'a', headcount: 3, range: 'this' });
      expect(prisma.jamRoom.create).toHaveBeenCalledTimes(2);

      prisma.jamRoom.create.mockClear();
      prisma.jamRoom.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      await expect(
        service.createRoom({ title: 'a', headcount: 3, range: 'this' }),
      ).rejects.toThrow('방을 만들지 못했어요');
      expect(prisma.jamRoom.create).toHaveBeenCalledTimes(4);
    });
  });

  describe('들어오기', () => {
    it('없는 이름 → 새 참여자 + 출입증, 칸은 기간 일수만큼 0', async () => {
      seedRoom();
      const res = await service.enter('slugslugslug', {
        name: 'Kim',
        pin: '1234',
      });
      expect(res.participant).toMatchObject({
        name: 'Kim',
        slots: [0, 0, 0, 0, 0, 0, 0],
      });
      expect(prisma.parts[0].nameKey).toBe('kim');
      const access = await tokens.verify(res.token, 'slugslugslug');
      expect(access.participantId).toBe(res.participant.id);
    });

    it('있는 이름(대소문자 무시) + 맞는 비밀번호 → 그 참여자 출입증', async () => {
      seedRoom({ people: ['kim'] });
      const res = await service.enter('slugslugslug', {
        name: 'KIM',
        pin: '1234',
      });
      expect(res.participant.id).toBe('id-kim');
      expect(prisma.jamParticipant.create).not.toHaveBeenCalled();
    });

    it('있는 이름 + 틀린 비밀번호 → 401, 새 사람을 만들지 않음', async () => {
      seedRoom({ people: ['kim'] });
      await expect(
        service.enter('slugslugslug', { name: 'kim', pin: '9999' }),
      ).rejects.toThrow(new UnauthorizedException('비밀번호가 맞지 않아요'));
      expect(prisma.jamParticipant.create).not.toHaveBeenCalled();
    });

    it('동시에 같은 이름(P2002) → 있는 이름으로 다시 처리', async () => {
      seedRoom({ people: ['kim'] });
      // 처음 찾을 때는 아직 없었던 것처럼
      prisma.jamParticipant.findUnique.mockResolvedValueOnce(null);
      const res = await service.enter('slugslugslug', {
        name: 'kim',
        pin: '1234',
      });
      expect(res.participant.id).toBe('id-kim');
      expect(prisma.parts).toHaveLength(1);

      prisma.jamParticipant.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.enter('slugslugslug', { name: 'kim', pin: '0000' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('끝난 방 + 새 이름 → 403, 끝난 방 + 있는 이름 + 맞는 비밀번호 → 출입증', async () => {
      seedRoom({ endOffset: -1, people: ['kim'] });
      await expect(
        service.enter('slugslugslug', { name: 'lee', pin: '1234' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      const res = await service.enter('slugslugslug', {
        name: 'kim',
        pin: '1234',
      });
      expect(res.token).toEqual(expect.any(String));
    });

    it('인원을 넘어 들어오면 인원이 참여자 수로 올라감', async () => {
      const room = seedRoom({ headcount: 2, people: ['a', 'b'] });
      await service.enter('slugslugslug', { name: 'c', pin: '1234' });
      expect(room.headcount).toBe(3);
    });

    it('인원이 아직 몰라요(null)면 그대로', async () => {
      const room = seedRoom({ headcount: null, people: ['a'] });
      await service.enter('slugslugslug', { name: 'c', pin: '1234' });
      expect(room.headcount).toBeNull();
    });
  });

  describe('제목·인원 바꾸기', () => {
    it('참여자 수보다 적은 인원 → 400', async () => {
      seedRoom({ headcount: 3, people: ['a', 'b'] });
      await expect(
        service.updateRoom('slugslugslug', access('a'), { headcount: 1 }),
      ).rejects.toThrow(
        new BadRequestException('참여한 사람보다 적게 정할 수 없어요'),
      );
    });

    it('참여자 수와 같은 인원, null, 키 없음', async () => {
      const room = seedRoom({ headcount: 5, people: ['a', 'b'] });
      await service.updateRoom('slugslugslug', access('a'), { headcount: 2 });
      expect(room.headcount).toBe(2);
      await service.updateRoom('slugslugslug', access('a'), {
        title: '새 제목',
      });
      expect(room).toMatchObject({ headcount: 2, title: '새 제목' });
      const view = await service.updateRoom('slugslugslug', access('a'), {
        headcount: null,
      });
      expect(view.headcount).toBeNull();
    });

    it('끝난 방 → 403', async () => {
      seedRoom({ endOffset: -1, people: ['a'] });
      await expect(
        service.updateRoom('slugslugslug', access('a'), { title: 'x' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('가능 칸 저장·빠지기', () => {
    it('길이·값 검사', async () => {
      seedRoom({ people: ['a'] });
      await expect(
        service.saveMySlots(access('a'), { slots: [0, 0, 0] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.saveMySlots(access('a'), { slots: [16384, 0, 0, 0, 0, 0, 0] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      const saved = await service.saveMySlots(access('a'), {
        slots: [1, 2, 3, 0, 0, 0, 16383],
      });
      expect(saved.slots).toEqual([1, 2, 3, 0, 0, 0, 16383]);
    });

    it('끝난 방에서는 저장·빠지기 403', async () => {
      seedRoom({ endOffset: -1, people: ['a'] });
      await expect(
        service.saveMySlots(access('a'), { slots: [0, 0, 0, 0, 0, 0, 0] }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.leave(access('a'))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('빠지면 참여자가 지워짐', async () => {
      seedRoom({ people: ['a', 'b'] });
      await service.leave(access('a'));
      expect(prisma.parts.map((p) => p.name)).toEqual(['b']);
    });
  });

  it('지난 방 지우기: 마지막 날 < 오늘 - 7일만', async () => {
    for (const n of [-8, -7, -6, 0]) {
      prisma.rooms.push({
        id: `r${n}`,
        slug: `s${n}`,
        endDate: dbDay(n),
      } as JamRoom);
    }
    const count = await service.deleteExpiredRooms();
    expect(count).toBe(1);
    expect(prisma.rooms.map((r) => r.id)).toEqual(['r-7', 'r-6', 'r0']);
  });
});
