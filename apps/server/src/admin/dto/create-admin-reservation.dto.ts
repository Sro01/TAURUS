import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAdminReservationDto {
    @ApiProperty({ description: '슬롯 시작 시간 (정시, 09~22 KST)', example: '2026-02-12T14:00:00+09:00' })
    @IsDateString()
    @IsNotEmpty({ message: '시작 시간은 필수입니다.' })
    startTime!: string;

    @ApiPropertyOptional({ description: '예약 메모 (예: 병아리밴드, 활동기수 배정)', example: '병아리밴드' })
    @IsString()
    @IsOptional()
    description?: string;
}
