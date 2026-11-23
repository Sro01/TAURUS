import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { jamTokenExpiresAt } from './jam-slots';

export const JAM_AUDIENCE = 'jam';
export const ROOM_NOT_FOUND = '방을 찾을 수 없어요';
const NEED_ENTER = '이름과 비밀번호로 다시 들어와 주세요';

/** 방 출입증으로 확인된 요청 주체 (req.jam) */
export interface JamAccess {
  participantId: string;
  roomId: string;
}

interface JamTokenPayload {
  sub: string; // 참여자 id
  room: string; // 방 id
}

/** 방 출입증 발급·검증. 서비스(발급)와 가드(검증)가 같은 규칙을 쓴다 (스펙 4.5) */
@Injectable()
export class JamTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  sign(
    participant: { id: string },
    room: { id: string; endDate: Date },
    nowMs: number = Date.now(),
  ): string {
    return this.jwtService.sign(
      { sub: participant.id, room: room.id },
      {
        audience: JAM_AUDIENCE,
        expiresIn: this.expiresInSeconds(room.endDate, nowMs),
      },
    );
  }

  /** 만료(기간 마지막 날 + 8일 0시 KST)까지 남은 초. 이미 지났으면 60초 */
  expiresInSeconds(endDate: Date, nowMs: number = Date.now()): number {
    const left = jamTokenExpiresAt(endDate) - Math.floor(nowMs / 1000);
    return Math.max(left, 60);
  }

  /**
   * 서명·audience → 경로의 방과 출입증의 방이 같은지 → 참여자가 아직 있는지.
   * 출입증 없음·무효·빠진 참여자 401, 다른 방 403, 없는 방 404
   */
  async verify(token: string | undefined, slug: string): Promise<JamAccess> {
    if (!token) {
      throw new UnauthorizedException(NEED_ENTER);
    }

    let payload: JamTokenPayload;
    try {
      payload = this.jwtService.verify<JamTokenPayload>(token, {
        audience: JAM_AUDIENCE,
      });
    } catch {
      throw new UnauthorizedException(NEED_ENTER);
    }

    const room = await this.prisma.jamRoom.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!room) {
      throw new NotFoundException(ROOM_NOT_FOUND);
    }
    if (room.id !== payload.room) {
      throw new ForbiddenException('이 방의 출입증이 아니에요');
    }

    const participant = await this.prisma.jamParticipant.findFirst({
      where: { id: payload.sub, roomId: room.id },
      select: { id: true },
    });
    if (!participant) {
      throw new UnauthorizedException(NEED_ENTER);
    }

    return { participantId: participant.id, roomId: room.id };
  }
}
