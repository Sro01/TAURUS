import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { JamTokenService } from './jam-token.service';

const END = new Date('2026-11-28T00:00:00Z');

describe('JamTokenService', () => {
  const jwt = new JwtService({ secret: 'test' });
  const prisma = {
    jamRoom: {
      findUnique: jest.fn(({ where }: { where: { slug: string } }) =>
        Promise.resolve(
          { roomA: { id: 'A' }, roomB: { id: 'B' } }[where.slug] ?? null,
        ),
      ),
    },
    jamParticipant: {
      findFirst: jest.fn(
        ({ where }: { where: { id: string; roomId: string } }) =>
          Promise.resolve(
            where.id === 'p1' && where.roomId === 'A' ? { id: 'p1' } : null,
          ),
      ),
    },
  };
  const service = new JamTokenService(jwt, prisma as unknown as PrismaService);

  it('만료: 마지막 날 + 8일 0시 KST까지 남은 초', () => {
    const now = Date.parse('2026-11-28T00:00:00+09:00');
    expect(service.expiresInSeconds(END, now)).toBe(8 * 24 * 60 * 60);
    // 이미 지났으면 60초
    expect(
      service.expiresInSeconds(END, Date.parse('2027-01-01T00:00:00Z')),
    ).toBe(60);
  });

  it('발급한 출입증: sub = 참여자, room = 방, aud = jam', () => {
    const token = service.sign(
      { id: 'p1' },
      { id: 'A', endDate: END },
      Date.parse('2026-11-25T00:00:00Z'),
    );
    const payload = jwt.decode<{
      sub: string;
      room: string;
      aud: string;
      exp: number;
    }>(token);
    expect(payload).toMatchObject({ sub: 'p1', room: 'A', aud: 'jam' });
  });

  it('맞는 방 → { participantId, roomId }', async () => {
    const token = service.sign(
      { id: 'p1' },
      { id: 'A', endDate: new Date(Date.now() + 86400000) },
    );
    await expect(service.verify(token, 'roomA')).resolves.toEqual({
      participantId: 'p1',
      roomId: 'A',
    });
  });

  it('다른 방 → 403, 없는 방 → 404', async () => {
    const token = service.sign(
      { id: 'p1' },
      { id: 'A', endDate: new Date(Date.now() + 86400000) },
    );
    await expect(service.verify(token, 'roomB')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.verify(token, 'nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('출입증 없음, 팀 출입증(aud 없음), 빠진 참여자 → 401', async () => {
    await expect(service.verify(undefined, 'roomA')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    const team = jwt.sign({ sub: 'p1', room: 'A', role: 'USER' });
    await expect(service.verify(team, 'roomA')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    const gone = service.sign(
      { id: 'p2' },
      { id: 'A', endDate: new Date(Date.now() + 86400000) },
    );
    await expect(service.verify(gone, 'roomA')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
