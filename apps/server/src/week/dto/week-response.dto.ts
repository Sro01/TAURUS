import { ApiProperty } from '@nestjs/swagger';
import { Week, WeekStatus } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const KST = 'Asia/Seoul';

export class WeekResponseDto {
    @ApiProperty()
    id!: number;

    @ApiProperty({ description: '주차 시작일 (KST)', example: '2026-02-09T00:00:00+09:00' })
    startDate!: string;

    @ApiProperty({ description: '주차 종료일 (KST)', example: '2026-02-15T23:59:59+09:00' })
    endDate!: string;

    @ApiProperty({ enum: WeekStatus })
    status!: WeekStatus;

    @ApiProperty()
    weekNumber!: number;

    @ApiProperty({ description: '연도' })
    year!: number;

    @ApiProperty({ description: '표기용 주차 (예: 1월 1주차)' })
    displayName!: string;

    constructor(week: Week, displayName: string) {
        this.id = week.id;
        this.startDate = dayjs(week.startDate).tz(KST).format();
        this.endDate = dayjs(week.endDate).tz(KST).format();
        this.status = week.status;
        this.weekNumber = week.weekNumber;
        this.year = week.year;
        this.displayName = displayName;
    }
}
