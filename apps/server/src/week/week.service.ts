import { Injectable, OnModuleInit, NotFoundException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationService } from '../reservation/reservation.service';
import { WeekResponseDto } from './dto/week-response.dto';
import { Week, WeekStatus, Prisma } from '@prisma/client';
import dayjs from '../common/utils/dayjs';
import {
    DAYS_PER_WEEK,
    MAX_WEEKS_PER_YEAR,
    WEEK_START_DAY,
    WEEK_END_DAY,
    WEEK_ROTATION_CRON,
    WEEK_DISPLAY_STANDARD_DAY,
    TIMEZONE,
    DAY_NAMES,
} from '../constants/week.constants';

export interface RotationResult {
    message: string;
}

export interface StatusSyncResult {
    closed: number;
    open: number;
    upcoming: number;
}

@Injectable()
export class WeekService implements OnModuleInit {
    private readonly logger = new Logger(WeekService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly reservationService: ReservationService,
    ) { }

    async onModuleInit(): Promise<void> {
        this.logger.log('초기화 시작...');

        try {
            await this.ensureWeeksExist();
            await this.syncWeekStatuses();
            this.logger.log('초기화 완료');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.stack || error.message : String(error);
            this.logger.error('초기화 실패', errorMessage);
            throw error;
        }
    }

    // ────────────────────────────────────────────────
    // 주차 계산 유틸리티
    // ────────────────────────────────────────────────

    /**
     * 특정 날짜가 속한 주의 시작일(일요일) 계산
     * @param date 기준 날짜
     * @returns 해당 주의 일요일 00:00:00 (locale 독립적)
     */
    private getWeekStartDate(date: dayjs.Dayjs): dayjs.Dayjs {
        const currentDayOfWeek = date.day();

        if (currentDayOfWeek === WEEK_START_DAY) {
            return date.startOf('day');
        }

        const daysFromSunday = currentDayOfWeek - WEEK_START_DAY;
        return date.subtract(daysFromSunday, 'day').startOf('day');
    }

    /**
     * 주차 종료일(토요일) 계산
     * @param weekStartDate 주차 시작일 (일요일)
     * @returns 토요일 23:59:59
     */
    private getWeekEndDate(weekStartDate: dayjs.Dayjs): dayjs.Dayjs {
        const daysToSaturday = WEEK_END_DAY - WEEK_START_DAY;
        return weekStartDate.add(daysToSaturday, 'day').endOf('day');
    }

    /**
     * 연도의 첫 주차 시작일 계산
     * @param year 연도
     * @returns 1월 1일이 속한 주의 일요일
     */
    private getFirstWeekStartOfYear(year: number): dayjs.Dayjs {
        const jan1 = dayjs.tz(`${year}-01-01`, TIMEZONE);
        return this.getWeekStartDate(jan1);
    }

    // ────────────────────────────────────────────────
    // 주차 데이터 관리
    // ────────────────────────────────────────────────

    /**
     * 주차 데이터 생성 (존재하지 않을 때만)
     * 현재 연도와 내년 데이터를 선제적으로 생성하여 연말 전환을 대비합니다.
     */
    private async ensureWeeksExist(): Promise<void> {
        const today = dayjs().tz(TIMEZONE);
        const yearsToEnsure = [today.year(), today.year() + 1];

        for (const year of yearsToEnsure) {
            const existingCount = await this.countWeeksByYear(year);

            if (existingCount > 0) {
                this.logger.log(
                    `[WeekService] ${year}년 주차 데이터 이미 존재 (${existingCount}개). 생성을 건너뜁니다.`
                );
                continue;
            }

            this.logger.log(`[WeekService] ${year}년 주차 데이터 생성 시작...`);

            const weeksData = this.generateWeeksData(year);

            try {
                await this.prisma.week.createMany({
                    data: weeksData,
                    skipDuplicates: true,
                });

                this.logger.log(
                    `[WeekService] ${year}년 주차 ${weeksData.length}개 생성 완료 ` +
                    `(${DAY_NAMES[WEEK_START_DAY]} 시작)`
                );

            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.error(
                    `[WeekService] ${year}년 주차 데이터 생성 중 오류 발생: ${errorMessage}`
                );
                throw error;
            }
        }
    }

    /**
     * 특정 연도의 주차 수 조회
     */
    private async countWeeksByYear(year: number): Promise<number> {
        return this.prisma.week.count({
            where: { year },
        });
    }

    /**
     * 연도별 주차 데이터 생성 (중복 방지 로직 적용)
     * "다음 해 1주차 시작일 전"까지만 생성하여 물리적 주차 중복을 차단합니다.
     */
    private generateWeeksData(year: number): Prisma.WeekCreateManyInput[] {
        const week1Start = this.getFirstWeekStartOfYear(year);
        const nextYearWeek1Start = this.getFirstWeekStartOfYear(year + 1);

        // 해당 연도에 포함되는 물리적 주차 수 계산 (보통 52주, 드물게 53주)
        const totalWeeks = nextYearWeek1Start.diff(week1Start, 'week');

        const weeksData: Prisma.WeekCreateManyInput[] = [];
        let currentWeekStart = week1Start;

        for (let weekNumber = 1; weekNumber <= totalWeeks; weekNumber++) {
            const weekEndDate = this.getWeekEndDate(currentWeekStart);

            weeksData.push({
                startDate: currentWeekStart.toDate(),
                endDate: weekEndDate.toDate(),
                year,
                weekNumber,
                status: WeekStatus.UPCOMING,
            });

            currentWeekStart = currentWeekStart.add(DAYS_PER_WEEK, 'day');
        }

        return weeksData;
    }

    /**
     * 주차 상태 동기화
     */
    private async syncWeekStatuses(): Promise<StatusSyncResult> {
        const now = dayjs().tz(TIMEZONE);
        const currentWeekStart = this.getWeekStartDate(now);
        const nextWeekStart = currentWeekStart.add(DAYS_PER_WEEK, 'day');

        // 트랜잭션 수행 (PrismaPromise 배열 전달)
        const [closedResult, openResult, upcomingResult] = await this.prisma.$transaction([
            this.prisma.week.updateMany({
                where: {
                    startDate: { lt: currentWeekStart.toDate() },
                    status: { not: WeekStatus.CLOSED },
                },
                data: { status: WeekStatus.CLOSED },
            }),
            this.prisma.week.updateMany({
                where: {
                    startDate: {
                        gte: currentWeekStart.toDate(),
                        lt: nextWeekStart.toDate(),
                    },
                    status: { not: WeekStatus.OPEN },
                },
                data: { status: WeekStatus.OPEN },
            }),
            this.prisma.week.updateMany({
                where: {
                    startDate: { gte: nextWeekStart.toDate() },
                    status: { not: WeekStatus.UPCOMING },
                },
                data: { status: WeekStatus.UPCOMING },
            }),
        ]);

        const result = {
            closed: closedResult.count,
            open: openResult.count,
            upcoming: upcomingResult.count,
        };

        if (result.closed > 0 || result.open > 0 || result.upcoming > 0) {
            this.logger.log(
                `상태 동기화: ${result.closed} CLOSED, ` +
                `${result.open} OPEN, ${result.upcoming} UPCOMING`
            );
        }

        return result;
    }

    /**
     * 주차 상태 일괄 업데이트
     */
    private async updateWeeksStatus(
        where: Prisma.WeekWhereInput,
        targetStatus: WeekStatus
    ): Promise<{ count: number }> {
        return this.prisma.week.updateMany({
            where: {
                ...where,
                status: { not: targetStatus },
            },
            data: { status: targetStatus },
        });
    }

    // ────────────────────────────────────────────────
    // 공개 API
    // ────────────────────────────────────────────────

    /**
     * 메인 주차 정보 조회 (이번 주 & 다음 주)
     */
    async getMainWeeks(): Promise<{
        main: WeekResponseDto;
        next: WeekResponseDto;
    }> {
        const now = dayjs().tz(TIMEZONE);
        const mainWeekStart = this.getWeekStartDate(now);
        const nextWeekStart = mainWeekStart.add(DAYS_PER_WEEK, 'day');

        const [mainWeek, nextWeek] = await Promise.all([
            this.findWeekByStartDate(mainWeekStart),
            this.findWeekByStartDate(nextWeekStart),
        ]);

        if (!mainWeek || !nextWeek) {
            throw new NotFoundException('주차 정보를 찾을 수 없습니다.');
        }

        return {
            main: this.toDto(mainWeek),
            next: this.toDto(nextWeek),
        };
    }

    /**
     * 특정 날짜가 속한 주차 찾기
     */
    async getWeekByDate(date: dayjs.Dayjs): Promise<Week> {
        const weekStart = this.getWeekStartDate(date);
        const week = await this.findWeekByStartDate(weekStart);

        if (!week) {
            throw new NotFoundException(
                `${date.format('YYYY-MM-DD')}에 해당하는 주차를 찾을 수 없습니다.`
            );
        }

        return week;
    }

    /**
     * 시작일로 주차 찾기
     */
    private async findWeekByStartDate(startDate: dayjs.Dayjs): Promise<Week | null> {
        return this.prisma.week.findFirst({
            where: {
                startDate: {
                    gte: startDate.toDate(),
                    lt: startDate.add(1, 'day').toDate(),
                },
            },
        });
    }

    /**
     * 전체 주차 목록 조회
     */
    async findAll(): Promise<WeekResponseDto[]> {
        const weeks = await this.prisma.week.findMany({
            orderBy: { startDate: 'asc' },
        });

        return weeks.map(week => this.toDto(week));
    }

    // ────────────────────────────────────────────────
    // 주차 전환
    // ────────────────────────────────────────────────

    /**
     * Cron: 설정된 시각에 주차 전환
     */
    @Cron(WEEK_ROTATION_CRON, { timeZone: TIMEZONE })
    async handleWeekRotation(): Promise<void> {
        this.logger.log(
            `주차 자동 전환 시작 (${DAY_NAMES[WEEK_START_DAY]} ` +
            `${String(0).padStart(2, '0')}:${String(0).padStart(2, '0')} ${TIMEZONE})`
        );

        try {
            const result = await this.rotation();
            this.logger.log(`주차 전환 완료: ${result.message}`);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.stack || error.message : String(error);
            this.logger.error('주차 전환 실패', errorMessage);
            throw error;
        }
    }

    /**
     * 주차 전환 로직 (Cron 또는 수동 호출)
     */
    async rotation(): Promise<RotationResult> {
        const { main } = await this.getMainWeeks();

        // 과거 주차 CLOSED 처리
        await this.prisma.week.updateMany({
            where: {
                startDate: { lt: main.startDate },
                status: { not: WeekStatus.CLOSED },
            },
            data: { status: WeekStatus.CLOSED },
        });

        // 현재 주차 OPEN 처리
        await this.prisma.week.update({
            where: { id: main.id },
            data: { status: WeekStatus.OPEN },
        });

        // PENDING 예약 집계
        const rotationResult = await this.reservationService.processRotation(main.id);

        this.logger.log(
            `PENDING 집계 완료: ${rotationResult.confirmed}건 확정, ` +
            `${rotationResult.voided}건 폭파`
        );

        return {
            message:
                `${main.year}년 ${main.weekNumber}주차 OPEN ` +
                `(${rotationResult.confirmed} 확정, ${rotationResult.voided} 폭파)`,
        };
    }

    // ────────────────────────────────────────────────
    // DTO 변환
    // ────────────────────────────────────────────────

    /**
     * Week 엔티티를 DTO로 변환
     * "N월 N주차" 표기 계산 (설정된 기준 요일 기준)
     */
    private toDto(week: Week): WeekResponseDto {
        const displayName = this.calculateDisplayName(week.startDate);
        return new WeekResponseDto(week, displayName);
    }

    /**
     * "N월 N주차" 표기 계산
     * @param weekStartDate 주차 시작일 (일요일)
     * @returns "N월 N주차" 형식
     */
    private calculateDisplayName(weekStartDate: Date): string {
        // 기준 요일 (예: 수요일) 날짜 계산
        const standardDay = dayjs(weekStartDate).add(
            WEEK_DISPLAY_STANDARD_DAY - WEEK_START_DAY,
            'day'
        );
        const month = standardDay.month() + 1;

        // 해당 월의 첫 번째 기준 요일 찾기
        const firstDayOfMonth = standardDay.startOf('month');
        const firstStandardDay = this.findFirstDayOfWeek(
            firstDayOfMonth,
            WEEK_DISPLAY_STANDARD_DAY
        );

        // 주차 계산
        const daysDiff = standardDay.diff(firstStandardDay, 'day');
        const weekOfMonth = Math.floor(daysDiff / DAYS_PER_WEEK) + 1;

        return `${month}월 ${weekOfMonth}주차`;
    }

    /**
     * 특정 월에서 첫 번째 특정 요일 찾기
     * @param startDate 시작 날짜
     * @param targetDayOfWeek 찾을 요일 (0=일, 1=월, ...)
     * @returns 첫 번째 해당 요일
     */
    private findFirstDayOfWeek(
        startDate: dayjs.Dayjs,
        targetDayOfWeek: number
    ): dayjs.Dayjs {
        let date = startDate;

        while (date.day() !== targetDayOfWeek) {
            date = date.add(1, 'day');
        }

        return date;
    }
}
