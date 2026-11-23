import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AdminVerifyDto } from './dto/admin-verify.dto';
import { CreateAdminReservationDto } from './dto/create-admin-reservation.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { Prisma, Reservation, ReservationStatus, ReservationType } from '@prisma/client';
import { ReservationResponseDto } from '../reservation/dto/reservation-response.dto';
import {
    AdminReservationPreviewDto,
    CreateAdminReservationsResultDto,
    OverwrittenSlotDto,
    SkippedAdminSlotDto,
} from './dto/admin-reservation-result.dto';
import { assertSlotStart } from '../common/utils/slot';
import dayjs from '../common/utils/dayjs';
import {
    KST,
    SLOT_DURATION_MIN,
    DEFAULT_MAX_SLOTS_PER_WEEK,
    DEFAULT_MAX_SLOTS_PER_DAY,
    CONFIG_KEY_MAX_SLOTS_PER_WEEK,
    CONFIG_KEY_MAX_SLOTS_PER_DAY,
    ADMIN_TOKEN_EXPIRY,
} from '../common/constants';

const toSkippedSlot = (r: Reservation): SkippedAdminSlotDto => ({
    startTime: dayjs(r.startTime).tz(KST).format(),
    description: r.description,
});

@Injectable()
export class AdminService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    // ──────────────────────────────────────
    // 관리자 인증 (verify)
    // 마스터 패스워드 검증 후 JWT 발급 (1시간)
    // ──────────────────────────────────────
    async verify(dto: AdminVerifyDto) {
        const masterPassword = process.env.ADMIN_PASSWORD;
        if (!masterPassword) {
            throw new UnauthorizedException('서버에 관리자 비밀번호가 설정되지 않았습니다.');
        }

        if (dto.password !== masterPassword) {
            throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
        }

        // 관리자 전용 토큰 발급 (role: ADMIN, 1시간)
        const payload = { sub: 'admin', username: 'admin', role: 'ADMIN' };
        return {
            access_token: this.jwtService.sign(payload, { expiresIn: ADMIN_TOKEN_EXPIRY }),
        };
    }

    // ──────────────────────────────────────
    // 시스템 설정 조회
    // ──────────────────────────────────────
    async getSettings() {
        const [maxSlots, maxSlotsPerDay] = await Promise.all([
            this.prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY_MAX_SLOTS_PER_WEEK } }),
            this.prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY_MAX_SLOTS_PER_DAY } }),
        ]);

        return {
            maxSlotsPerWeek: maxSlots ? parseInt(maxSlots.value, 10) : DEFAULT_MAX_SLOTS_PER_WEEK,
            maxSlotsPerDay: maxSlotsPerDay ? parseInt(maxSlotsPerDay.value, 10) : DEFAULT_MAX_SLOTS_PER_DAY,
        };
    }

    // ──────────────────────────────────────
    // 시스템 설정 변경
    // ──────────────────────────────────────
    async updateSettings(dto: UpdateSettingsDto) {
        if (dto.maxSlotsPerWeek !== undefined) {
            await this.prisma.systemConfig.upsert({
                where: { key: CONFIG_KEY_MAX_SLOTS_PER_WEEK },
                update: { value: dto.maxSlotsPerWeek.toString() },
                create: { key: CONFIG_KEY_MAX_SLOTS_PER_WEEK, value: dto.maxSlotsPerWeek.toString() },
            });
        }

        if (dto.maxSlotsPerDay !== undefined) {
            await this.prisma.systemConfig.upsert({
                where: { key: CONFIG_KEY_MAX_SLOTS_PER_DAY },
                update: { value: dto.maxSlotsPerDay.toString() },
                create: { key: CONFIG_KEY_MAX_SLOTS_PER_DAY, value: dto.maxSlotsPerDay.toString() },
            });
        }

        return {
            message: '시스템 설정이 변경되었습니다.',
            maxSlotsPerWeek: dto.maxSlotsPerWeek,
            maxSlotsPerDay: dto.maxSlotsPerDay,
        };
    }

    // ──────────────────────────────────────
    // 관리자 우선 예약 미리 보기 (아무것도 바꾸지 않음)
    // 예약하기 전에 건너뛸 칸(이미 관리자 예약)과 팀 예약이 취소될 칸을 알려 준다
    // ──────────────────────────────────────
    async previewAdminReservations(dto: CreateAdminReservationDto): Promise<AdminReservationPreviewDto> {
        const slotWeeks = await this.resolveAdminSlots(dto.startTimes);
        const slotTimes = slotWeeks.map(({ slot }) => slot.toDate());

        const adminTaken = await this.findAdminTaken(this.prisma, slotTimes);
        const takenTimes = new Set(adminTaken.map((r) => r.startTime.getTime()));
        const targetTimes = slotTimes.filter((t) => !takenTimes.has(t.getTime()));

        const teamActive = targetTimes.length === 0 ? [] : await this.prisma.reservation.findMany({
            where: {
                startTime: { in: targetTimes },
                status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
            },
            include: { team: { select: { name: true } } },
            orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
        });

        // 칸마다 묶기 (startTime 오름차순 유지)
        const overwritten = new Map<number, OverwrittenSlotDto>();
        for (const r of teamActive) {
            const key = r.startTime.getTime();
            const slot = overwritten.get(key) ?? { startTime: dayjs(r.startTime).tz(KST).format(), teams: [] };
            slot.teams.push({
                teamName: r.team?.name ?? null,
                status: r.status === ReservationStatus.CONFIRMED ? 'CONFIRMED' : 'PENDING',
            });
            overwritten.set(key, slot);
        }

        return {
            newSlotCount: targetTimes.length,
            skipped: adminTaken.map(toSkippedSlot),
            overwritten: [...overwritten.values()],
        };
    }

    // ──────────────────────────────────────
    // 관리자 우선 예약 생성 (여러 칸 한 번에)
    // 제한 무시, CONFIRMED_ADMIN 상태, teamId: null
    // - 이미 관리자 예약이 있는 칸은 건너뛰고 skipped로 돌려준다
    // - 나머지 칸의 팀 예약(CONFIRMED, PENDING)은 취소하고 관리자 예약으로 덮어쓴다
    // - 시간이 잘못됐거나 주차가 없는 칸이 하나라도 있으면 아무것도 잡지 않는다
    // ──────────────────────────────────────
    async createAdminReservations(dto: CreateAdminReservationDto): Promise<CreateAdminReservationsResultDto> {
        const slotWeeks = await this.resolveAdminSlots(dto.startTimes);

        return this.prisma.$transaction(async (tx) => {
            // 1. 이미 관리자 예약이 있는 칸은 건너뛴다
            const adminTaken = await this.findAdminTaken(tx, slotWeeks.map(({ slot }) => slot.toDate()));
            const takenTimes = new Set(adminTaken.map((r) => r.startTime.getTime()));
            const targets = slotWeeks.filter(({ slot }) => !takenTimes.has(slot.valueOf()));

            if (targets.length > 0) {
                // 2. 덮어쓸 칸의 팀 예약 취소
                await tx.reservation.updateMany({
                    where: {
                        startTime: { in: targets.map(({ slot }) => slot.toDate()) },
                        status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
                    },
                    data: { status: ReservationStatus.CANCELLED },
                });
            }

            // 3. 관리자 예약 생성
            const created = targets.length === 0 ? [] : await tx.reservation.createManyAndReturn({
                data: targets.map(({ slot, weekId }) => ({
                    startTime: slot.toDate(),
                    endTime: slot.add(SLOT_DURATION_MIN, 'minute').toDate(),
                    status: ReservationStatus.CONFIRMED_ADMIN,
                    type: ReservationType.ADMIN,
                    weekId,
                    teamId: null, // 시스템 예약
                    description: dto.description || null,
                })),
            });

            return {
                created: created
                    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
                    .map((r) => new ReservationResponseDto(r, true)),
                skipped: adminTaken.map(toSkippedSlot),
            };
        });
    }

    /**
     * 관리자 예약 칸 해석: 시간 검사 + 중복 제거 + 주차 매칭 (오름차순).
     * 잘못된 시간이거나 주차가 없는 칸이 하나라도 있으면 던진다.
     */
    private async resolveAdminSlots(startTimes: string[]): Promise<{ slot: dayjs.Dayjs; weekId: number }[]> {
        // 같은 시각은 한 칸
        const slotMap = new Map<number, dayjs.Dayjs>();
        for (const raw of startTimes) {
            const kst = dayjs(raw).tz(KST);
            assertSlotStart(kst);
            slotMap.set(kst.valueOf(), kst);
        }
        const slots = [...slotMap.values()].sort((a, b) => a.valueOf() - b.valueOf());

        // 범위 안 주차를 한 번에 읽어 칸마다 찾는다 (모든 주차 가능)
        const first = slots[0].toDate();
        const last = slots[slots.length - 1].toDate();
        const weeks = await this.prisma.week.findMany({
            where: { startDate: { lte: last }, endDate: { gte: first } },
        });
        return slots.map((slot) => {
            const t = slot.toDate();
            const week = weeks.find((w) => w.startDate <= t && w.endDate >= t);
            if (!week) {
                throw new NotFoundException(`${slot.format('M/D HH:mm')}에 대응하는 주차가 없습니다.`);
            }
            return { slot, weekId: week.id };
        });
    }

    /** 이 시각들에 이미 있는 관리자 예약 (오름차순) */
    private findAdminTaken(client: Prisma.TransactionClient, slotTimes: Date[]) {
        return client.reservation.findMany({
            where: { startTime: { in: slotTimes }, status: ReservationStatus.CONFIRMED_ADMIN },
            orderBy: { startTime: 'asc' },
        });
    }

    // ──────────────────────────────────────
    // 특정 팀의 예약 내역 조회
    // ──────────────────────────────────────
    async getReservationsByTeam(teamId: string) {
        const team = await this.prisma.team.findUnique({ where: { id: teamId } });
        if (!team) throw new NotFoundException('팀을 찾을 수 없습니다.');

        const reservations = await this.prisma.reservation.findMany({
            where: { teamId },
            orderBy: { startTime: 'desc' },
            include: {
                week: {
                    select: { weekNumber: true }
                },
                team: {
                    select: { name: true }
                }
            }
        });

        return reservations.map(r => new ReservationResponseDto(r, true));
    }

    // ──────────────────────────────────────
    // 예약 강제 취소
    // ──────────────────────────────────────
    async cancelReservation(id: string) {
        const reservation = await this.prisma.reservation.findUnique({ where: { id } });
        if (!reservation) throw new NotFoundException('예약을 찾을 수 없습니다.');

        await this.prisma.reservation.update({
            where: { id },
            data: { status: ReservationStatus.CANCELLED },
        });

        return { message: '예약이 강제 취소되었습니다.' };
    }

    // ──────────────────────────────────────
    // 팀 강제 삭제
    // ──────────────────────────────────────
    async deleteTeam(id: string) {
        const team = await this.prisma.team.findUnique({ where: { id } });
        if (!team) throw new NotFoundException('팀을 찾을 수 없습니다.');

        // Cascade로 예약도 삭제됨
        await this.prisma.team.delete({ where: { id } });

        return { message: '팀이 삭제되었습니다.' };
    }
}
