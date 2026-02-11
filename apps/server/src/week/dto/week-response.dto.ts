import { ApiProperty } from '@nestjs/swagger';
import { Week, WeekStatus } from '@prisma/client';

export class WeekResponseDto {
    @ApiProperty()
    id!: number;

    @ApiProperty()
    startDate!: Date;

    @ApiProperty()
    endDate!: Date;

    @ApiProperty({ enum: WeekStatus })
    status!: WeekStatus;

    @ApiProperty()
    weekNumber!: number;

    @ApiProperty({ description: '표기용 주차 (예: 1월 1주차)' })
    displayName!: string;

    constructor(week: Week) {
        this.id = week.id;
        this.startDate = week.startDate;
        this.endDate = week.endDate;
        this.status = week.status;
        this.weekNumber = week.weekNumber;
        this.displayName = ''; // Service에서 채워줌
    }
}
