import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInstantReservationDto } from './dto/create-instant-reservation.dto';
import { CreatePreReservationDto } from './dto/create-pre-reservation.dto';
import { ReservationResponseDto } from './dto/reservation-response.dto';
import { ReservationStatus, ReservationType, WeekStatus } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

// 한국 서비스 — 모든 슬롯 시간 검증은 KST 기준
const KST = 'Asia/Seoul';

// 타임슬롯 규칙 상수
const SLOT_START_HOUR = 9;   // 09:00 시작
const SLOT_END_HOUR = 22;    // 22:00 마지막 슬롯 (22:00~22:50)
const SLOT_DURATION_MIN = 50; // 50분 진행
const DEFAULT_MAX_SLOTS = 2;  // 기본 주당 최대 예약 수
const DEFAULT_MAX_SLOTS_PER_DAY = 1; // 기본 하루 최대 예약 수

import { AdminService } from '../admin/admin.service';

@Injectable()
export class ReservationService {
    constructor(
        private prisma: PrismaService,
        private adminService: AdminService,
    ) { }

    // ──────────────────────────────────────
    // 바로 예약 (README 2번)
    // 선착순, 즉시 CONFIRMED
    // ──────────────────────────────────────
    async createInstant(teamId: string, dto: CreateInstantReservationDto): Promise<ReservationResponseDto> {
        // 관리자 권한 예약인 경우 AdminService로 위임
        if (teamId === 'admin') {
            const adminReservation = await this.adminService.createAdminReservation({
                startTime: dto.startTime,
            });
            return new ReservationResponseDto(adminReservation, true);
        }

        const startTime = dayjs(dto.startTime);
        const endTime = startTime.add(SLOT_DURATION_MIN, 'minute');

        // 1. 슬롯 유효성 검증
        this.validateSlotTime(startTime);

        // 2. startTime이 속한 주차 자동 매칭 (OPEN 상태만)
        const week = await this.prisma.week.findFirst({
            where: {
                startDate: { lte: startTime.toDate() },
                endDate: { gte: startTime.toDate() },
            },
        });
        if (!week) throw new NotFoundException('해당 날짜에 대응하는 주차가 없습니다.');
        if (week.status !== WeekStatus.OPEN) {
            throw new BadRequestException('바로 예약은 현재 OPEN 상태인 주차에서만 가능합니다.');
        }

        // 3. 해당 슬롯에 이미 확정된 예약이 없는지 확인 (선착순 중복 방지)
        const existingConfirmed = await this.prisma.reservation.findFirst({
            where: {
                startTime: startTime.toDate(),
                weekId: week.id,
                status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.CONFIRMED_ADMIN] },
            },
        });
        if (existingConfirmed) {
            throw new ConflictException('이미 예약된 시간대입니다.');
        }

        // 4. 예약 제한 체크 (관리자는 위에서 별도 처리됨, 여기는 일반 사용자만)
        await this.checkMaxSlots(teamId, week.id);
        await this.checkDailyMaxSlots(teamId, startTime);

        // 5. 예약 생성 (즉시 CONFIRMED)
        const reservation = await this.prisma.reservation.create({
            data: {
                startTime: startTime.toDate(),
                endTime: endTime.toDate(),
                status: ReservationStatus.CONFIRMED,
                type: ReservationType.INSTANT,
                teamId,
                weekId: week.id,
            },
            include: { team: { select: { name: true } } },
        });

        return new ReservationResponseDto(reservation, true);
    }

    // ──────────────────────────────────────
    // 미리 예약 (README 3번)
    // 자유 신청, PENDING 상태
    // ──────────────────────────────────────
    async createPre(teamId: string, dto: CreatePreReservationDto): Promise<ReservationResponseDto> {
        // 관리자 권한 예약인 경우 AdminService로 위임 (미리 예약이어도 관리자는 즉시 확정/강제 예약 로직 따름)
        if (teamId === 'admin') {
            const adminReservation = await this.adminService.createAdminReservation({
                startTime: dto.startTime,
            });
            return new ReservationResponseDto(adminReservation, true);
        }

        const startTime = dayjs(dto.startTime);
        const endTime = startTime.add(SLOT_DURATION_MIN, 'minute');

        // 1. 슬롯 유효성 검증
        this.validateSlotTime(startTime);

        // 2. startTime이 속한 주차 자동 매칭 (UPCOMING 상태만)
        const week = await this.prisma.week.findFirst({
            where: {
                startDate: { lte: startTime.toDate() },
                endDate: { gte: startTime.toDate() },
            },
        });
        if (!week) throw new NotFoundException('해당 날짜에 대응하는 주차가 없습니다.');
        if (week.status !== WeekStatus.UPCOMING) {
            throw new BadRequestException('미리 예약은 다음 주차(UPCOMING)에서만 가능합니다.');
        }

        // 3. 같은 팀이 같은 슬롯에 중복 신청했는지 확인
        const duplicateRequest = await this.prisma.reservation.findFirst({
            where: {
                startTime: startTime.toDate(),
                weekId: week.id,
                teamId,
                status: ReservationStatus.PENDING,
            },
        });
        if (duplicateRequest) {
            throw new ConflictException('이미 해당 시간대에 미리 예약을 신청했습니다.');
        }

        // 4. 예약 제한 체크 (관리자는 위에서 별도 처리됨, 여기는 일반 사용자만)
        await this.checkMaxSlots(teamId, week.id);
        await this.checkDailyMaxSlots(teamId, startTime);

        // 5. 예약 생성 (PENDING)
        const reservation = await this.prisma.reservation.create({
            data: {
                startTime: startTime.toDate(),
                endTime: endTime.toDate(),
                status: ReservationStatus.PENDING,
                type: ReservationType.PRE,
                teamId,
                weekId: week.id,
            },
            include: { team: { select: { name: true } } },
        });

        // 미리 예약은 팀명 비공개
        return new ReservationResponseDto(reservation, false);
    }

    // ──────────────────────────────────────
    // 내 예약 현황 조회 (README 4-2)
    // ──────────────────────────────────────
    async findMyReservations(teamId: string): Promise<ReservationResponseDto[]> {
        // 관리자: CONFIRMED_ADMIN 상태인 모든 예약 조회
        if (teamId === 'admin') {
            const reservations = await this.prisma.reservation.findMany({
                where: {
                    status: ReservationStatus.CONFIRMED_ADMIN,
                },
                orderBy: { startTime: 'asc' },
            });
            return reservations.map(r => new ReservationResponseDto(r, true));
        }

        // 일반 사용자: 본인 팀의 CONFIRMED, PENDING 예약 조회
        const reservations = await this.prisma.reservation.findMany({
            where: {
                teamId,
                status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
            },
            include: { team: { select: { name: true } } },
            orderBy: { startTime: 'asc' },
        });

        return reservations.map(r => new ReservationResponseDto(r, true));
    }

    // ──────────────────────────────────────
    // 주차별 예약 현황 조회
    // 'current' = 이번 주, 'next' = 다음 주, 숫자 = weekNumber
    // 바로 예약(CONFIRMED): 팀명 공개
    // 미리 예약(PENDING): 팀 수만 표기
    // ──────────────────────────────────────
    async findByWeek(weekParam: string) {
        const week = await this.resolveWeek(weekParam);

        // 모든 활성 예약 조회
        const reservations = await this.prisma.reservation.findMany({
            where: {
                weekId: week.id,
                status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.CONFIRMED_ADMIN, ReservationStatus.PENDING] },
            },
            include: { team: { select: { name: true } } },
            orderBy: { startTime: 'asc' },
        });

        // 확정 예약: 팀명 공개 / 대기 예약: 팀 수만 공개
        const confirmed = reservations
            .filter(r => r.status === ReservationStatus.CONFIRMED || r.status === ReservationStatus.CONFIRMED_ADMIN)
            .map(r => new ReservationResponseDto(r, true));

        // PENDING 예약을 슬롯별로 그룹화하여 팀 수만 반환
        const pendingBySlot = new Map<string, number>();
        reservations
            .filter(r => r.status === ReservationStatus.PENDING)
            .forEach(r => {
                const key = r.startTime.toISOString();
                pendingBySlot.set(key, (pendingBySlot.get(key) || 0) + 1);
            });

        const pendingSummary = Array.from(pendingBySlot.entries()).map(([startTime, count]) => ({
            startTime,
            pendingCount: count,
        }));

        return { confirmed, pendingSummary };
    }

    // ──────────────────────────────────────
    // 예약 취소 (README 4-2)
    // 본인 예약만 취소 가능
    // ──────────────────────────────────────
    async cancel(teamId: string, reservationId: string): Promise<{ message: string }> {
        const reservation = await this.prisma.reservation.findUnique({
            where: { id: reservationId },
        });

        if (!reservation) throw new NotFoundException('예약을 찾을 수 없습니다.');
            if (reservation.teamId !== teamId) {
                throw new ForbiddenException('본인의 예약만 취소할 수 있습니다.');
            }
        if (reservation.status === ReservationStatus.CANCELLED || reservation.status === ReservationStatus.VOID) {
            throw new BadRequestException('이미 취소되었거나 무효화된 예약입니다.');
        }

        await this.prisma.reservation.update({
            where: { id: reservationId },
            data: { status: ReservationStatus.CANCELLED },
        });

        return { message: '예약이 취소되었습니다.' };
    }

    // ──────────────────────────────────────
    // 주차 전환 시 PENDING 집계 (README 1-3, 3-3, 3-4)
    // WeekService.rotation()에서 호출됨
    // ──────────────────────────────────────
    async processRotation(weekId: number): Promise<{ confirmed: number; voided: number }> {
        // 해당 주차의 모든 PENDING 예약 조회
        const pendingReservations = await this.prisma.reservation.findMany({
            where: {
                weekId,
                status: ReservationStatus.PENDING,
            },
        });

        // 슬롯별로 그룹화
        const slotGroups = new Map<string, string[]>();
        for (const reservation of pendingReservations) {
            const key = reservation.startTime.toISOString();
            if (!slotGroups.has(key)) slotGroups.set(key, []);
            slotGroups.get(key)!.push(reservation.id);
        }

        let confirmed = 0;
        let voided = 0;

        for (const [, reservationIds] of slotGroups) {
            if (reservationIds.length === 1) {
                // 1팀 단독 신청 → CONFIRMED
                await this.prisma.reservation.update({
                    where: { id: reservationIds[0] },
                    data: { status: ReservationStatus.CONFIRMED },
                });
                confirmed++;
            } else {
                // 2팀 이상 → 전부 VOID (폭파)
                await this.prisma.reservation.updateMany({
                    where: { id: { in: reservationIds } },
                    data: { status: ReservationStatus.VOID },
                });
                voided += reservationIds.length;
            }
        }

        return { confirmed, voided };
    }

    // ──────────────────────────────────────
    // 공통: 슬롯 시간 유효성 검증 (KST 기준)
    // ──────────────────────────────────────
    private validateSlotTime(startTime: dayjs.Dayjs) {
        const now = dayjs();

        // 과거 시간 체크
        if (startTime.isBefore(now) || startTime.isSame(now)) {
            throw new BadRequestException('현재 시각 이후의 시간만 예약할 수 있습니다.');
        }

        // KST로 변환 후 검증 (UTC 입력이든 로컬 입력이든 동일하게 처리)
        const kstTime = startTime.tz(KST);

        // 정시 체크 (분, 초가 0이어야 함)
        if (kstTime.minute() !== 0 || kstTime.second() !== 0) {
            throw new BadRequestException('예약은 매 시 정각에만 가능합니다.');
        }

        // 시간 범위 체크 (09~22 KST)
        const hour = kstTime.hour();
        if (hour < SLOT_START_HOUR || hour > SLOT_END_HOUR) {
            throw new BadRequestException(`예약 가능 시간은 ${SLOT_START_HOUR}:00 ~ ${SLOT_END_HOUR}:00 (KST)입니다.`);
        }
    }

    // ──────────────────────────────────────
    // 공통: MaxSlotsPerWeek 체크
    // CONFIRMED + PENDING ≤ MaxSlotsPerWeek
    // ──────────────────────────────────────
    private async checkMaxSlots(teamId: string, weekId: number) {
        const maxSlots = await this.getMaxSlotsPerWeek();

        const activeCount = await this.prisma.reservation.count({
            where: {
                teamId,
                weekId,
                status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
            },
        });

        if (activeCount >= maxSlots) {
            throw new BadRequestException(
                `주당 최대 예약 수(${maxSlots}개)를 초과했습니다. (현재 ${activeCount}개)`,
            );
        }
    }

    // SystemConfig에서 MaxSlotsPerWeek 값 조회 (기본값: 2)
    private async getMaxSlotsPerWeek(): Promise<number> {
        const config = await this.prisma.systemConfig.findUnique({
            where: { key: 'MaxSlotsPerWeek' },
        });
        return config ? parseInt(config.value, 10) : DEFAULT_MAX_SLOTS;
    }

    // ──────────────────────────────────────
    // 공통: MaxSlotsPerDay 체크
    // 해당 날짜에 CONFIRMED + PENDING ≤ MaxSlotsPerDay
    // ──────────────────────────────────────
    private async checkDailyMaxSlots(teamId: string, startTime: dayjs.Dayjs) {
        const maxSlotsPerDay = await this.getMaxSlotsPerDay();

        const startOfDay = startTime.startOf('day').toDate();
        const endOfDay = startTime.endOf('day').toDate();

        const dailyCount = await this.prisma.reservation.count({
            where: {
                teamId,
                startTime: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
            },
        });

        if (dailyCount >= maxSlotsPerDay) {
            throw new BadRequestException(
                `하루 최대 예약 수(${maxSlotsPerDay}개)를 초과했습니다. (현재 ${dailyCount}개)`,
            );
        }
    }

    private async getMaxSlotsPerDay(): Promise<number> {
        const config = await this.prisma.systemConfig.findUnique({
            where: { key: 'MaxSlotsPerDay' },
        });
        return config ? parseInt(config.value, 10) : DEFAULT_MAX_SLOTS_PER_DAY;
    }

    // ──────────────────────────────────────
    // 공통: 주차 키워드 해석
    // 'current' = OPEN 주차, 'next' = UPCOMING 주차, 숫자 = weekNumber
    // ──────────────────────────────────────
    private async resolveWeek(weekParam: string) {
        // 키워드 처리
        if (weekParam === 'current') {
            const week = await this.prisma.week.findFirst({ where: { status: WeekStatus.OPEN } });
            if (!week) throw new NotFoundException('현재 OPEN 상태인 주차가 없습니다.');
            return week;
        }

        if (weekParam === 'next') {
            const week = await this.prisma.week.findFirst({
                where: { status: WeekStatus.UPCOMING },
                orderBy: { startDate: 'asc' },
            });
            if (!week) throw new NotFoundException('다음 주차(UPCOMING)가 없습니다.');
            return week;
        }

        // 숫자인 경우 weekNumber로 처리
        const weekNumber = parseInt(weekParam, 10);
        if (isNaN(weekNumber)) {
            throw new BadRequestException('\"current\", \"next\", 또는 주차번호(숫자)를 입력해주세요.');
        }

        const week = await this.prisma.week.findFirst({ where: { weekNumber } });
        if (!week) throw new NotFoundException(`${weekNumber}주차를 찾을 수 없습니다.`);
        return week;
    }
}
