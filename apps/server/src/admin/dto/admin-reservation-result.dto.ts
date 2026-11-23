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

/** 덮어쓰면 취소될 팀 예약 */
export class OverwrittenTeamDto {
    @ApiProperty({ nullable: true })
    teamName!: string | null;

    @ApiProperty({ enum: ['CONFIRMED', 'PENDING'], description: '확정 / 미리 예약 대기' })
    status!: 'CONFIRMED' | 'PENDING';
}

/** 팀 예약이 있어 덮어쓸 칸 */
export class OverwrittenSlotDto {
    @ApiProperty({ description: '칸 시작 시간 (KST)', example: '2026-02-12T14:00:00+09:00' })
    startTime!: string;

    @ApiProperty({ type: [OverwrittenTeamDto] })
    teams!: OverwrittenTeamDto[];
}

export class AdminReservationPreviewDto {
    @ApiProperty({ description: '새로 잡힐 칸 수 (건너뛸 칸 제외)' })
    newSlotCount!: number;

    @ApiProperty({ type: [SkippedAdminSlotDto], description: '이미 관리자 예약이 있어 건너뛸 칸' })
    skipped!: SkippedAdminSlotDto[];

    @ApiProperty({ type: [OverwrittenSlotDto], description: '팀 예약이 취소되고 관리자 예약으로 바뀔 칸' })
    overwritten!: OverwrittenSlotDto[];
}
