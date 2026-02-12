import { IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePreReservationDto {
    @ApiProperty({ description: '슬롯 시작 시간 (정시, 09~22 KST)', example: '2026-02-16T10:00:00+09:00' })
    @IsDateString()
    @IsNotEmpty({ message: '시작 시간은 필수입니다.' })
    startTime!: string;
}
