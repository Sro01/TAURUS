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
  return {
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
    nameKey: name.toLowerCase(),
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
});
