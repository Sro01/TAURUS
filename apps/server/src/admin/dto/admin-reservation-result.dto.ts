import { ApiProperty } from '@nestjs/swagger';
import { ReservationResponseDto } from '../../reservation/dto/reservation-response.dto';

/** 이미 관리자 예약이 있어 건너뛴 칸 */
export class SkippedAdminSlotDto {
    @ApiProperty({ description: '칸 시작 시간 (KST)', example: '2026-02-12T14:00:00+09:00' })
    startTime!: string;

    @ApiProperty({ description: '먼저 잡혀 있던 관리자 예약의 메모', nullable: true })
    description!: string | null;
}

export class CreateAdminReservationsResultDto {
    @ApiProperty({ type: [ReservationResponseDto], description: '새로 잡은 관리자 예약' })
    created!: ReservationResponseDto[];

    @ApiProperty({ type: [SkippedAdminSlotDto], description: '이미 관리자 예약이 있어 건너뛴 칸' })
    skipped!: SkippedAdminSlotDto[];
}
