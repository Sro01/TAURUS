import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationService } from '../reservation/reservation.service';
import { WeekResponseDto } from './dto/week-response.dto';
import { WeekStatus } from '@prisma/client';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

@Injectable()
export class WeekService implements OnModuleInit {
    constructor(
        private prisma: PrismaService,
        private reservationService: ReservationService,
    ) { }

    async onModuleInit() {
        // 앱 시작 시 올해 주차 데이터가 없으면 생성
        await this.ensureWeeksExist();
        // 현재 시각 기준으로 주차 상태 동기화 (지난 주차 → CLOSED, 현재 주차 → OPEN)
        await this.syncWeekStatuses();
    }

    // 현재 시각 기준으로 주차 상태 자동 동기화
    private async syncWeekStatuses() {
        const now = dayjs();
        const isSundayAfter18 = now.day() === 0 && now.hour() >= 18;

        // 메인 주차의 시작일 계산
        let mainWeekStart = now.startOf('isoWeek');
        if (isSundayAfter18) {
            mainWeekStart = mainWeekStart.add(1, 'week');
        }

        // 1. 메인 주차 이전의 모든 주차 → CLOSED
        const closedResult = await this.prisma.week.updateMany({
            where: {
                startDate: { lt: mainWeekStart.toDate() },
                status: { not: WeekStatus.CLOSED },
            },
            data: { status: WeekStatus.CLOSED },
        });

        // 2. 현재 메인 주차 → OPEN
        const openResult = await this.prisma.week.updateMany({
            where: {
                startDate: mainWeekStart.toDate(),
                status: { not: WeekStatus.OPEN },
            },
            data: { status: WeekStatus.OPEN },
        });

        if (closedResult.count > 0 || openResult.count > 0) {
            console.log(`Week statuses synced: ${closedResult.count} CLOSED, ${openResult.count} OPEN`);
        }
    }

    // 주차 데이터 생성 (현재 연도 내)
    private async ensureWeeksExist() {
        const today = dayjs();
        const currentYear = today.year();

        // ISO 8601 기준: 1월 4일이 포함된 주가 1주차
        const jan4 = dayjs(`${currentYear}-01-04`);
        let startDate = jan4.startOf('isoWeek');

        // 기존 데이터 확인 (1주차 시작일이 다르면 재생성)
        const week1 = await this.prisma.week.findFirst({
            where: { weekNumber: 1 }
        });

        if (week1 && !dayjs(week1.startDate).isSame(startDate, 'day')) {
            console.log('Detecting incorrect week data based on ISO 8601. Re-generating...');
            await this.prisma.week.deleteMany({});
        }

        // 이미 데이터가 존재하면 스킵
        const existingCount = await this.prisma.week.count();
        if (existingCount > 0) return;

        // 53주차까지 한 번에 생성 (createMany 사용)
        const weeksData: { startDate: Date; endDate: Date; weekNumber: number; status: WeekStatus }[] = [];
        for (let i = 1; i <= 53; i++) {
            const endDate = startDate.endOf('isoWeek');
            weeksData.push({
                startDate: startDate.toDate(),
                endDate: endDate.toDate(),
                weekNumber: i,
                status: WeekStatus.UPCOMING,
            });
            startDate = startDate.add(1, 'week');
        }

        await this.prisma.week.createMany({ data: weeksData });
        console.log(`Created ${weeksData.length} weeks for year ${currentYear} (ISO 8601)`);
    }

    // 메인 주차 정보 조회 (이번 주 & 다음 주)
    async getMainWeeks(): Promise<{ main: WeekResponseDto, next: WeekResponseDto }> {
        const now = dayjs();
        const isSundayAfter18 = now.day() === 0 && now.hour() >= 18;

        // 현재 달력상 이번 주
        let currentCalendarWeekStart = now.startOf('isoWeek');

        // 로직: 일요일 18시 이후면 '다음 주'가 '메인 주차'가 됨
        let mainWeekStart = currentCalendarWeekStart;
        if (isSundayAfter18) {
            mainWeekStart = mainWeekStart.add(1, 'week');
        }

        const nextWeekStart = mainWeekStart.add(1, 'week');

        // DB 조회
        // 1. 메인 주차
        const mainWeek = await this.prisma.week.findFirst({
            where: { startDate: mainWeekStart.toDate() }
        });

        // 2. 다음 주차
        const nextWeek = await this.prisma.week.findFirst({
            where: { startDate: nextWeekStart.toDate() }
        });

        if (!mainWeek || !nextWeek) {
            // 데이터가 없으면 생성 후 재호출 (엣지 케이스)
            await this.ensureWeeksExist();
            throw new NotFoundException('주차 정보를 찾을 수 없습니다. (데이터 생성 중일 수 있음)');
        }

        return {
            main: this.toDto(mainWeek),
            next: this.toDto(nextWeek),
        };
    }

    // 전체 주차 목록 조회 (Admin)
    async findAll(): Promise<WeekResponseDto[]> {
        const weeks = await this.prisma.week.findMany({
            orderBy: { startDate: 'asc' }
        });
        return weeks.map(w => this.toDto(w));
    }

    // ──────────────────────────────────────
    // Cron: 매주 일요일 18:00 자동 주차 전환
    // ──────────────────────────────────────
    @Cron('0 18 * * 0')
    async handleWeekRotation() {
        console.log('[Cron] 주차 자동 전환 시작...');
        const result = await this.rotation();
        console.log(`[Cron] 주차 전환 완료: ${result.message}`);
    }

    // 주차 전환 (Cron 또는 수동 호출)
    async rotation() {
        const { main, next } = await this.getMainWeeks();

        // 1. 이전 주차들을 CLOSED로 변경
        await this.prisma.week.updateMany({
            where: {
                startDate: { lt: main.startDate },
                status: { not: WeekStatus.CLOSED },
            },
            data: { status: WeekStatus.CLOSED },
        });

        // 2. 메인 주차를 OPEN으로 설정
        await this.prisma.week.update({
            where: { id: main.id },
            data: { status: WeekStatus.OPEN },
        });

        // 3. PENDING 예약 집계 (1팀→CONFIRMED, 2팀+→VOID)
        const rotationResult = await this.reservationService.processRotation(main.id);
        console.log(`[Rotation] PENDING 집계: ${rotationResult.confirmed} 확정, ${rotationResult.voided} 폭파`);

        return {
            message: `Week ${main.weekNumber} is now OPEN. Previous weeks are CLOSED. (${rotationResult.confirmed} confirmed, ${rotationResult.voided} voided)`,
        };
    }
    private toDto(week: any): WeekResponseDto {
        // "N월 N주차" 표기 계산
        // ISO 8601 기준: 그 주의 목요일이 속한 달 + 그 달의 몇 번째 주인지
        const thursday = dayjs(week.startDate).add(3, 'day');
        const month = thursday.month() + 1;

        const firstDayOfMonth = thursday.startOf('month');

        // 해당 월의 첫 번째 목요일 찾기
        let firstThursday = firstDayOfMonth;
        while (firstThursday.isoWeekday() !== 4) {
            firstThursday = firstThursday.add(1, 'day');
        }

        // 현재 주의 목요일과 첫 목요일의 주 차이 = N주차
        const weekOfMonth = Math.floor(thursday.diff(firstThursday, 'day') / 7) + 1;
        const displayName = `${month}월 ${weekOfMonth}주차`;

        return new WeekResponseDto(week, displayName);
    }
}
