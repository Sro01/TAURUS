import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Prisma, Team } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { TeamService } from './team.service';
import { normalizeName } from '../common/utils/name';

type FindUniqueArgs = { where: { id?: string; nameKey?: string } };

// 가짜 팀 테이블: id·nameKey로 찾기만 흉내 낸다
function fakePrisma(rows: Team[]) {
  const findUnique = jest.fn(({ where }: FindUniqueArgs) =>
    Promise.resolve(
      rows.find((t) =>
        where.id !== undefined
          ? t.id === where.id
          : t.nameKey === where.nameKey,
      ) ?? null,
    ),
  );
  // $queryRaw 태그 호출을 받아 SQL의 WHERE(두 방향 포함)를 흉내 낸다. 값은 모두 같은 key
  const $queryRaw = jest.fn(
    (_strings: TemplateStringsArray, ...values: unknown[]) => {
      const key = values[0] as string;
      return Promise.resolve(
        rows.filter(
          (t) =>
            t.nameKey.includes(key) ||
            (key.length >= 2 && key.includes(t.nameKey)),
        ),
      );
    },
  );
  return {
    $queryRaw,
    team: {
      findUnique,
      create: jest.fn(({ data }: { data: Partial<Team> }) =>
        Promise.resolve({ ...makeTeam('new-id', data.name!), ...data }),
      ),
      update: jest.fn(() => Promise.resolve({})),
    },
  };
}

function makeTeam(id: string, name: string, password = 'hash'): Team {
  return {
    id,
    name,
    nameKey: normalizeName(name),
    password,
    role: 'USER',
    tokenVersion: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('TeamService', () => {
  let teamService: TeamService;
  let authService: AuthService;
  let prisma: ReturnType<typeof fakePrisma>;

  beforeEach(async () => {
    const hash = await bcrypt.hash('1234', 4);
    prisma = fakePrisma([
      makeTeam('fight-id', 'FIGHTMAN', hash),
      makeTeam('other-id', 'OTHER', hash),
    ]);
    const module = await Test.createTestingModule({
      providers: [
        TeamService,
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jest.fn(() => 'token') } },
      ],
    }).compile();
    teamService = module.get(TeamService);
    authService = module.get(AuthService);
  });

  describe('대소문자만 다른 이름으로 인증', () => {
    it('fightman → 기존 FIGHTMAN 팀, 새 팀을 만들지 않음', async () => {
      const res = await authService.verify({
        name: 'fightman',
        password: '1234',
        autoRegister: true,
      });
      expect(res.isNewTeam).toBe(false);
      expect(prisma.team.findUnique).toHaveBeenCalledWith({
        where: { nameKey: 'fightman' },
      });
      expect(prisma.team.create).not.toHaveBeenCalled();
    });

    it('비밀번호가 틀리면 401, 새 팀을 만들지 않음', async () => {
      await expect(
        authService.verify({
          name: 'Fight Man',
          password: '9999',
          autoRegister: true,
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.team.create).not.toHaveBeenCalled();
    });
  });

  describe('create (등록·자동 등록)', () => {
    it('비교용 이름이 겹치면 409', async () => {
      await expect(
        teamService.create('Fight-man', '1234'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.team.create).not.toHaveBeenCalled();
    });

    it('register도 같은 409', async () => {
      await expect(
        authService.register({ name: 'fightman', password: '1234' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('자음·모음 이름은 400', async () => {
      await expect(
        teamService.create('안티ㅡ프', '1234'),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        authService.verify({
          name: 'ㅇㅌㅍㄹㅈ',
          password: '1234',
          autoRegister: true,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.team.create).not.toHaveBeenCalled();
    });

    it('비교용 이름이 빈 값이면 찾지 않고, autoRegister는 400', async () => {
      await expect(teamService.findByName('???')).resolves.toBeNull();
      await expect(
        authService.verify({
          name: '🎸',
          password: '1234',
          autoRegister: true,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.team.findUnique).not.toHaveBeenCalled();
    });

    it('비교용 이름이 빈 값이면 400', async () => {
      await expect(teamService.create('!!! ', '1234')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.team.create).not.toHaveBeenCalled();
    });

    it('보여 줄 이름은 그대로, nameKey는 비교용 이름으로 저장', async () => {
      await teamService.create('New Band!', '1234');
      expect(prisma.team.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Band!',
          nameKey: 'newband',
        }) as unknown,
      });
    });

    it('동시에 같은 이름으로 저장되어 P2002가 나면 409', async () => {
      prisma.team.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      await expect(
        teamService.create('NewBand', '1234'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('updateName', () => {
    it('다른 팀과 비교용 이름이 겹치면 409', async () => {
      await expect(
        teamService.updateName('other-id', 'fight man'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.team.update).not.toHaveBeenCalled();
    });

    it('자기 팀 이름의 대소문자만 바꾸는 건 됨', async () => {
      await teamService.updateName('fight-id', 'FightMan');
      expect(prisma.team.update).toHaveBeenCalledWith({
        where: { id: 'fight-id' },
        data: { name: 'FightMan', nameKey: 'fightman' },
      });
    });

    it('자음·모음 이름은 400', async () => {
      await expect(
        teamService.updateName('other-id', '밴드ㅋ'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('비교용 이름이 빈 값이면 400', async () => {
      await expect(
        teamService.updateName('other-id', '★★'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
  describe('search (팀 이름 검색)', () => {
    // 검색 전용 팀 목록으로 바꿔 끼운다
    async function serviceWith(names: string[]) {
      prisma = fakePrisma(names.map((n, i) => makeTeam(`id-${i}`, n)));
      const module = await Test.createTestingModule({
        providers: [
          TeamService,
          { provide: PrismaService, useValue: prisma },
          { provide: JwtService, useValue: { sign: jest.fn() } },
        ],
      }).compile();
      return module.get(TeamService);
    }

    const names = (items: { name: string }[]) => items.map((t) => t.name);

    it('대소문자·띄어쓰기만 다른 입력 → exact', async () => {
      const svc = await serviceWith(['FIGHTMAN', 'OTHER']);
      const res = await svc.search('fight man');
      expect(res.problem).toBeNull();
      expect(res.exact).toEqual({ id: 'id-0', name: 'FIGHTMAN' });
      expect(names(res.matches)).toEqual(['FIGHTMAN']);
    });

    it('입력 키가 값이 아니라 파라미터로 넘어감', async () => {
      const svc = await serviceWith(['FIGHTMAN']);
      await svc.search('Fight');
      const [strings, ...values] = prisma.$queryRaw.mock.calls[0];
      expect(strings.join('')).not.toContain('fight');
      expect(values).toEqual(['fight', 'fight', 'fight']);
    });

    it('팀 이름이 입력 키를 포함 → matches, exact 없음', async () => {
      const svc = await serviceWith(['브로콜리너마저', 'OTHER']);
      const res = await svc.search('콜리');
      expect(res.exact).toBeNull();
      expect(names(res.matches)).toEqual(['브로콜리너마저']);
    });

    it('입력이 더 길어 입력 키가 팀 이름을 포함 → matches', async () => {
      const svc = await serviceWith(['브로콜리', 'OTHER']);
      const res = await svc.search('브로콜리너마저');
      expect(res.exact).toBeNull();
      expect(names(res.matches)).toEqual(['브로콜리']);
    });

    it('입력 키가 1글자면 반대쪽 포함은 보지 않음', async () => {
      const svc = await serviceWith(['A', 'BAND']);
      const res = await svc.search('b');
      // 'b'는 'BAND'에 포함됨. 팀 'A'는 원래도 해당 없음
      expect(names(res.matches)).toEqual(['BAND']);

      const svc2 = await serviceWith(['B', 'XB']);
      const res2 = await svc2.search('b');
      // 정확히 같은 'B'와 'b'를 포함한 'XB'만. 반대쪽 포함 검사는 2글자부터
      expect(names(res2.matches)).toEqual(['B', 'XB']);

      const svc3 = await serviceWith(['가']);
      const res3 = await svc3.search('나');
      expect(res3.matches).toEqual([]);
    });

    it('1글자 팀은 2글자 이상 입력에 포함되면 matches', async () => {
      const svc = await serviceWith(['가']);
      const res = await svc.search('가나');
      expect(names(res.matches)).toEqual(['가']);
    });

    it('정렬: exact → 입력 키로 시작 → 나머지, 묶음 안은 이름 순, 최대 5개', async () => {
      const svc = await serviceWith([
        '하밴드',
        '밴드',
        '밴드C',
        '밴드A',
        '우리밴드',
        '가밴드',
        '밴드B',
        '밴',
      ]);
      const res = await svc.search('밴드');
      expect(res.exact).toEqual({ id: 'id-1', name: '밴드' });
      expect(names(res.matches)).toEqual([
        '밴드',
        '밴드A',
        '밴드B',
        '밴드C',
        '가밴드',
      ]);
    });

    it('빈 입력 → problem null, DB 조회 없음', async () => {
      const svc = await serviceWith(['FIGHTMAN']);
      await expect(svc.search('')).resolves.toEqual({
        problem: null,
        exact: null,
        matches: [],
      });
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('비교용 이름이 빈 값 → EMPTY_KEY, DB 조회 없음', async () => {
      const svc = await serviceWith(['FIGHTMAN']);
      await expect(svc.search('!!! ')).resolves.toEqual({
        problem: 'EMPTY_KEY',
        exact: null,
        matches: [],
      });
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('자음·모음 이름 → LOOSE_JAMO, 찾은 팀은 그대로 줌', async () => {
      const svc = await serviceWith(['밴드']);
      const res = await svc.search('밴드ㅋ');
      expect(res.problem).toBe('LOOSE_JAMO');
      expect(res.exact).toEqual({ id: 'id-0', name: '밴드' });

      await expect(svc.search('ㅇㅌㅍ')).resolves.toEqual({
        problem: 'LOOSE_JAMO',
        exact: null,
        matches: [],
      });
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });
});
