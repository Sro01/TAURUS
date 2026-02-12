import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingsDto {
    @ApiProperty({ description: '팀별 주당 최대 예약 가능 슬롯 수', example: 2 })
    @IsInt({ message: 'maxSlotsPerWeek는 정수여야 합니다.' })
    @Min(2, { message: 'maxSlotsPerWeek는 최소 2 이상이어야 합니다.' })
    maxSlotsPerWeek!: number;

    @ApiProperty({ description: '팀별 하루 최대 예약 가능 슬롯 수', example: 1 })
    @IsInt({ message: 'maxSlotsPerDay는 정수여야 합니다.' })
    @Min(1, { message: 'maxSlotsPerDay는 최소 1 이상이어야 합니다.' })
    maxSlotsPerDay!: number;
}
