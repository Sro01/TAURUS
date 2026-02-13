import { ApiProperty } from '@nestjs/swagger';
import { Reservation, ReservationStatus, ReservationType } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const KST = 'Asia/Seoul';

export class ReservationResponseDto {
    @ApiProperty()
    id!: string;

    @ApiProperty({ description: '슬롯 시작 시간 (KST)', example: '2026-02-12T14:00:00+09:00' })
    startTime!: string;

    @ApiProperty({ description: '슬롯 종료 시간 (KST)', example: '2026-02-12T14:50:00+09:00' })
    endTime!: string;

    @ApiProperty({ enum: ReservationStatus })
    status!: ReservationStatus;

    @ApiProperty({ enum: ReservationType })
    type!: ReservationType;

    @ApiProperty({ nullable: true })
    teamId!: string | null;

    @ApiProperty({ description: '팀명 (바로 예약: 공개 / 미리 예약: null)', nullable: true })
    teamName!: string | null;

    @ApiProperty()
    weekId!: number;

    @ApiProperty({ description: '생성 시각 (KST)' })
    createdAt!: string;

    @ApiProperty({ description: '팀 설명 (합주곡, 관리자 메모 등등)', nullable: true })
    description!: string | null;

    constructor(reservation: Reservation & { team?: { name: string } | null }, showTeamName: boolean) {
        this.id = reservation.id;
        this.startTime = dayjs(reservation.startTime).tz(KST).format();
        this.endTime = dayjs(reservation.endTime).tz(KST).format();
        this.status = reservation.status;
        this.type = reservation.type;
        this.teamId = reservation.teamId;

        if (showTeamName) {
            this.teamName = reservation.team?.name || (reservation.type === ReservationType.ADMIN ? '관리자' : null);
        } else {
            this.teamName = null;
        }

        this.weekId = reservation.weekId;
        this.createdAt = dayjs(reservation.createdAt).tz(KST).format();
        this.description = reservation.description;
    }
}
