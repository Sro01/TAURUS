import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AdminVerifyDto } from './dto/admin-verify.dto';
import { CreateAdminReservationDto } from './dto/create-admin-reservation.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ReservationStatus, ReservationType } from '@prisma/client';
import { ReservationResponseDto } from '../reservation/dto/reservation-response.dto';
import { CreateAdminReservationsResultDto } from './dto/admin-reservation-result.dto';
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
    // 관리자 우선 예약 생성 (여러 칸 한 번에)
    // 제한 무시, CONFIRMED_ADMIN 상태, teamId: null
    // - 이미 관리자 예약이 있는 칸은 건너뛰고 skipped로 돌려준다
    // - 나머지 칸의 팀 예약(CONFIRMED, PENDING)은 취소하고 관리자 예약으로 덮어쓴다
    // - 시간이 잘못됐거나 주차가 없는 칸이 하나라도 있으면 아무것도 잡지 않는다
    // ──────────────────────────────────────
    async createAdminReservations(dto: CreateAdminReservationDto): Promise<CreateAdminReservationsResultDto> {
        // 1. 시간 검사 + 중복 제거 (같은 시각은 한 칸)
        const slotMap = new Map<number, dayjs.Dayjs>();
        for (const raw of dto.startTimes) {
            const kst = dayjs(raw).tz(KST);
            assertSlotStart(kst);
            slotMap.set(kst.valueOf(), kst);
        }
        const slots = [...slotMap.values()].sort((a, b) => a.valueOf() - b.valueOf());

        // 2. 주차 매칭 (모든 주차 가능) — 범위 안 주차를 한 번에 읽어 칸마다 찾는다
        const first = slots[0].toDate();
        const last = slots[slots.length - 1].toDate();
        const weeks = await this.prisma.week.findMany({
            where: { startDate: { lte: last }, endDate: { gte: first } },
        });
        const slotWeeks = slots.map((slot) => {
            const t = slot.toDate();
            const week = weeks.find((w) => w.startDate <= t && w.endDate >= t);
            if (!week) {
                throw new NotFoundException(`${slot.format('M/D HH:mm')}에 대응하는 주차가 없습니다.`);
            }
            return { slot, weekId: week.id };
        });

        return this.prisma.$transaction(async (tx) => {
            // 3. 이미 관리자 예약이 있는 칸은 건너뛴다
            const existingAdmin = await tx.reservation.findMany({
                where: {
                    startTime: { in: slots.map((s) => s.toDate()) },
                    status: ReservationStatus.CONFIRMED_ADMIN,
                },
            });
            const takenTimes = new Set(existingAdmin.map((r) => r.startTime.getTime()));
            const targets = slotWeeks.filter(({ slot }) => !takenTimes.has(slot.valueOf()));

            if (targets.length > 0) {
                const targetTimes = targets.map(({ slot }) => slot.toDate());

                // 4. 덮어쓸 칸의 팀 예약 취소
                await tx.reservation.updateMany({
                    where: {
                        startTime: { in: targetTimes },
                        status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
                    },
                    data: { status: ReservationStatus.CANCELLED },
                });
            }

            // 5. 관리자 예약 생성
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
                skipped: existingAdmin
                    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
                    .map((r) => ({
                        startTime: dayjs(r.startTime).tz(KST).format(),
                        description: r.description,
                    })),
            };
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
