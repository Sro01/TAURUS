import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AdminVerifyDto } from './dto/admin-verify.dto';
import { CreateAdminReservationDto } from './dto/create-admin-reservation.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ReservationStatus, ReservationType, WeekStatus } from '@prisma/client';
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
    // 관리자 우선 예약 생성
    // 제한 무시, CONFIRMED_ADMIN 상태, teamId: null
    // ──────────────────────────────────────
    async createAdminReservation(dto: CreateAdminReservationDto) {
        const startTime = dayjs(dto.startTime).tz(KST);
        const endTime = startTime.add(SLOT_DURATION_MIN, 'minute');

        // 1. 주차 자동 매칭 (모든 주차 가능)
        const week = await this.prisma.week.findFirst({
            where: {
                startDate: { lte: startTime.toDate() },
                endDate: { gte: startTime.toDate() },
            },
        });
        if (!week) throw new NotFoundException('해당 날짜에 대응하는 주차가 없습니다.');

        // 1.5. 기존 예약 확인 및 취소
        const formattingStartTime = startTime.toDate();

        // 1. 일반 사용자 예약(CONFIRMED, PENDING)이 있다면 취소 처리 (관리자 권한으로 덮어쓰기)
        const conflictReservations = await this.prisma.reservation.findMany({
            where: {
                startTime: formattingStartTime,
                weekId: week.id,
                status: {
                    in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING],
                },
            },
        });

        if (conflictReservations.length > 0) {
            await this.prisma.reservation.updateMany({
                where: {
                    id: { in: conflictReservations.map((r) => r.id) },
                },
                data: {
                    status: ReservationStatus.CANCELLED,
                },
            });
        }

        // 2. 관리자로 이미 예약된 건이 있는지 확인 (있으면 중복 생성 방지)
        const existingAdminReservation = await this.prisma.reservation.findFirst({
            where: {
                startTime: formattingStartTime,
                weekId: week.id,
                status: ReservationStatus.CONFIRMED_ADMIN,
            },
        });

        if (existingAdminReservation) {
            throw new BadRequestException('이미 관리자 권한으로 예약된 시간대입니다.');
        }

        // 2. 예약 생성 (강제)
        // teamId 없이 생성, description 활용 방안이 현재 스키마에 없음 -> 스키마에 description 필드 추가 필요?
        // 현재는 description을 저장할 곳이 없으므로 일단 제외하거나, 나중에 추가.
        // README에는 '병아리밴드, 활동기수 우선권 배정용'이라고 되어 있음.
        // 임시로 teamId 없이 예약만 생성. (메모 기능은 추후 추가 고려)

        const reservation = await this.prisma.reservation.create({
            data: {
                startTime: startTime.toDate(),
                endTime: endTime.toDate(),
                status: ReservationStatus.CONFIRMED_ADMIN,
                type: ReservationType.ADMIN,
                weekId: week.id,
                teamId: null, // 시스템 예약
            },
        });

        return reservation;
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
