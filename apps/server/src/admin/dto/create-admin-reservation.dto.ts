import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 한 번에 잡을 수 있는 칸 수 상한 (한 달 × 14칸 넉넉히) */
export const ADMIN_RESERVATION_MAX_SLOTS = 500;

export class CreateAdminReservationDto {
    @ApiProperty({
        description: '잡을 칸들의 시작 시간 (정시, 09~22 KST). 같은 값이 겹치면 한 번만 잡는다',
        example: ['2026-02-12T14:00:00+09:00', '2026-02-12T15:00:00+09:00'],
        type: [String],
    })
    @IsArray()
    @ArrayNotEmpty({ message: '시작 시간을 하나 이상 보내 주세요.' })
    @ArrayMaxSize(ADMIN_RESERVATION_MAX_SLOTS, { message: `한 번에 ${ADMIN_RESERVATION_MAX_SLOTS}칸까지 잡을 수 있습니다.` })
    @IsDateString({}, { each: true })
    startTimes!: string[];

    @ApiPropertyOptional({ description: '예약 메모 (예: 병아리밴드, 활동기수 배정)', example: '병아리밴드' })
    @IsString()
    @IsOptional()
    description?: string;
}
