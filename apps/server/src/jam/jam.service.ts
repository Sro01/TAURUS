import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { JamParticipant, JamRoom, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import dayjs from '../common/utils/dayjs';
import { normalizeName } from '../common/utils/name';
import { TIMEZONE, WEEK_ROTATION_CRON } from '../constants/week.constants';
import { PrismaService } from '../prisma/prisma.service';
import { WeekService } from '../week/week.service';
import { CreateRoomDto, JamRange } from './dto/create-room.dto';
import { EnterDto } from './dto/enter.dto';
import { SaveSlotsDto } from './dto/save-slots.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import {
  dayCount,
  emptySlots,
  expiredRoomCutoff,
  fromDbDate,
  isEnded,
  slotsError,
  toDbDate,
} from './jam-slots';
import {
  JamAccess,
  JamTokenService,
  ROOM_NOT_FOUND,
} from './jam-token.service';

const SLUG_LENGTH = 12;
const SLUG_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const SLUG_RETRIES = 3; // 겹치면 최대 3번 다시 만듦
const ENDED_ROOM = '끝난 방은 바꿀 수 없어요';

export interface JamParticipantView {
  id: string;
  name: string;
  slots: number[];
}

export interface JamRoomView {
  slug: string;
  title: string;
  headcount: number | null;
  startDate: string;
  endDate: string;
  ended: boolean;
  participants: JamParticipantView[];
}

/** 영문 대소문자+숫자 12자 (치우침 없이 248 미만 바이트만 씀) */
export function generateSlug(): string {
  let slug = '';
  while (slug.length < SLUG_LENGTH) {
    for (const byte of randomBytes(SLUG_LENGTH * 2)) {
      if (byte < 248 && slug.length < SLUG_LENGTH) {
        slug += SLUG_CHARS[byte % SLUG_CHARS.length];
      }
    }
  }
  return slug;
}

function isUniqueViolation(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
  );
}

function toParticipantView(p: JamParticipant): JamParticipantView {
  return { id: p.id, name: p.name, slots: p.slots };
}

@Injectable()
export class JamService {
  private readonly logger = new Logger(JamService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly weekService: WeekService,
    private readonly jamTokenService: JamTokenService,
  ) {}

  // ─── 방 ─────────────────────────────────

  /** 방 만들기. 기간 날짜는 만드는 순간의 이번 주(main)·다음 주(next) 주차에서 정함 */
  async createRoom(dto: CreateRoomDto): Promise<{ slug: string }> {
    const { startDate, endDate } = await this.periodFor(dto.range);

    for (let attempt = 0; attempt <= SLUG_RETRIES; attempt++) {
      try {
        const room = await this.prisma.jamRoom.create({
          data: {
            slug: generateSlug(),
            title: dto.title,
            headcount: dto.headcount,
            startDate,
            endDate,
          },
        });
        return { slug: room.slug };
      } catch (e) {
        if (!isUniqueViolation(e)) throw e;
      }
    }
    throw new ConflictException('방을 만들지 못했어요. 다시 눌러 주세요');
  }

  /** 이번 주: main 일~토, 다음 주: next 일~토, 둘 다: main 일 ~ next 토 */
  private async periodFor(
    range: JamRange,
  ): Promise<{ startDate: Date; endDate: Date }> {
    const { main, next } = await this.weekService.getMainWeeks();
    const start = range === 'next' ? next.startDate : main.startDate;
    const end = range === 'this' ? main.endDate : next.endDate;
    return { startDate: toDbDate(dayjs(start)), endDate: toDbDate(dayjs(end)) };
  }

  async getRoom(slug: string): Promise<JamRoomView> {
    const room = await this.prisma.jamRoom.findUnique({
      where: { slug },
      include: { participants: { orderBy: { createdAt: 'asc' } } },
    });
    if (!room) {
      throw new NotFoundException(ROOM_NOT_FOUND);
    }
    return {
      slug: room.slug,
      title: room.title,
      headcount: room.headcount,
      startDate: fromDbDate(room.startDate),
      endDate: fromDbDate(room.endDate),
      ended: isEnded(room.endDate),
      participants: room.participants.map(toParticipantView),
    };
  }

  /** 제목·인원 바꾸기. headcount가 undefined면 안 바꿈, null이면 아직 몰라요 */
  async updateRoom(
    slug: string,
    jam: JamAccess,
    dto: UpdateRoomDto,
  ): Promise<JamRoomView> {
    await this.prisma.$transaction(async (tx) => {
      const room = await this.lockRoom(tx, jam.roomId);
      if (isEnded(room.endDate)) {
        throw new ForbiddenException(ENDED_ROOM);
      }

      // JSON에는 undefined가 없어서 undefined = 키가 없음
      if (typeof dto.headcount === 'number') {
        const joined = await tx.jamParticipant.count({
          where: { roomId: room.id },
        });
        if (dto.headcount < joined) {
          throw new BadRequestException('참여한 사람보다 적게 정할 수 없어요');
        }
      }

      await tx.jamRoom.update({
        where: { id: room.id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.headcount !== undefined && { headcount: dto.headcount }),
        },
      });
    });
    return this.getRoom(slug);
  }

  // ─── 참여자 ───────────────────────────────

  /**
   * 들어오기 (모두의 시간 방식)
   * - 없는 이름: 새 참여자 (끝난 방이면 403). 인원을 넘으면 인원을 참여자 수로 올림
   * - 있는 이름 + 맞는 비밀번호: 그 참여자의 출입증 (끝난 방도 됨)
   * - 있는 이름 + 틀린 비밀번호: 401
   */
  async enter(
    slug: string,
    dto: EnterDto,
  ): Promise<{ token: string; participant: JamParticipantView }> {
    const room = await this.prisma.jamRoom.findUnique({ where: { slug } });
    if (!room) {
      throw new NotFoundException(ROOM_NOT_FOUND);
    }

    const name = dto.name.normalize('NFC');
    const nameKey = normalizeName(name);
    const where = { roomId_nameKey: { roomId: room.id, nameKey } };

    const existing = await this.prisma.jamParticipant.findUnique({ where });
    if (existing) {
      return this.enterExisting(room, existing, dto.pin);
    }

    if (isEnded(room.endDate)) {
      throw new ForbiddenException('끝난 방에는 새로 들어올 수 없어요');
    }

    const pinHash = await bcrypt.hash(dto.pin, 10);
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const locked = await this.lockRoom(tx, room.id);
        const participant = await tx.jamParticipant.create({
          data: {
            roomId: room.id,
            name,
            nameKey,
            pinHash,
            slots: emptySlots(dayCount(room.startDate, room.endDate)),
          },
        });
        const joined = await tx.jamParticipant.count({
          where: { roomId: room.id },
        });
        if (locked.headcount !== null && joined > locked.headcount) {
          await tx.jamRoom.update({
            where: { id: room.id },
            data: { headcount: joined },
          });
        }
        return participant;
      });
      return this.issue(room, created);
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
      // 같은 순간 같은 이름으로 먼저 들어온 사람이 있음 → 있는 이름으로 다시 처리
      const winner = await this.prisma.jamParticipant.findUnique({ where });
      if (!winner) throw e;
      return this.enterExisting(room, winner, dto.pin);
    }
  }

  private async enterExisting(
    room: JamRoom,
    participant: JamParticipant,
    pin: string,
  ): Promise<{ token: string; participant: JamParticipantView }> {
    if (!(await bcrypt.compare(pin, participant.pinHash))) {
      throw new UnauthorizedException('비밀번호가 맞지 않아요');
    }
    return this.issue(room, participant);
  }

  private issue(
    room: JamRoom,
    participant: JamParticipant,
  ): { token: string; participant: JamParticipantView } {
    return {
      token: this.jamTokenService.sign(participant, room),
      participant: toParticipantView(participant),
    };
  }

  /** 내 가능 칸 통째로 저장 */
  async saveMySlots(
    jam: JamAccess,
    dto: SaveSlotsDto,
  ): Promise<JamParticipantView> {
    const room = await this.findOpenRoom(jam.roomId);
    const error = slotsError(dto.slots, dayCount(room.startDate, room.endDate));
    if (error) {
      throw new BadRequestException(error);
    }
    const participant = await this.prisma.jamParticipant.update({
      where: { id: jam.participantId },
      data: { slots: dto.slots },
    });
    return toParticipantView(participant);
  }

  /** 나 빠지기. 내 칸도 같이 지워짐 */
  async leave(jam: JamAccess): Promise<{ message: string }> {
    await this.findOpenRoom(jam.roomId);
    await this.prisma.jamParticipant.delete({
      where: { id: jam.participantId },
    });
    return { message: '방에서 나갔어요' };
  }

  // ─── 지난 방 지우기 ─────────────────────────

  /** 일요일 0시(KST): 기간 마지막 날 < 오늘 - 7일 인 방을 지움 (참여자는 cascade) */
  @Cron(WEEK_ROTATION_CRON, { timeZone: TIMEZONE })
  async deleteExpiredRooms(): Promise<number> {
    const { count } = await this.prisma.jamRoom.deleteMany({
      where: { endDate: { lt: expiredRoomCutoff() } },
    });
    this.logger.log(`지난 합주 방 ${count}개 삭제`);
    return count;
  }

  // ─── 내부 ─────────────────────────────────

  private async findOpenRoom(roomId: string): Promise<JamRoom> {
    const room = await this.prisma.jamRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) {
      throw new NotFoundException(ROOM_NOT_FOUND);
    }
    if (isEnded(room.endDate)) {
      throw new ForbiddenException(ENDED_ROOM);
    }
    return room;
  }

  /** 인원·참여자 수를 같이 바꾸는 작업끼리 겹치지 않게 방 행을 잠금 */
  private async lockRoom(
    tx: Prisma.TransactionClient,
    roomId: string,
  ): Promise<JamRoom> {
    await tx.$queryRaw`SELECT 1 FROM "jam_rooms" WHERE "id" = ${roomId} FOR UPDATE`;
    const room = await tx.jamRoom.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException(ROOM_NOT_FOUND);
    }
    return room;
  }
}
