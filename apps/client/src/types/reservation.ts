// import { Team } from './team';

export enum ReservationStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    CONFIRMED_ADMIN = 'CONFIRMED_ADMIN',
    VOID = 'VOID',
    CANCELLED = 'CANCELLED',
}

export enum ReservationType {
    INSTANT = 'INSTANT',
    PRE = 'PRE',
    ADMIN = 'ADMIN',
}

/**
 * 예약 응답 DTO
 */
export interface Reservation {
    id: string;
    startTime: string; // ISO 8601
    endTime: string;   // ISO 8601
    status: ReservationStatus;
    type: ReservationType;
    teamId: string | null;
    teamName: string | null; // 서버에서 r.team?.name 매핑됨
    // 프론트엔드 호환성을 위한 추가 필드 (Service에서 매핑)
    team?: { name: string };
    weekId: number;
    createdAt: string;
    description: string | null;
    pendingCount?: number; // 주차별 조회 시 PENDING 요약용 (가상 필드)
}

/**
 * 바로 예약 생성 DTO
 */
export interface CreateInstantReservationDto {
    startTime: string;
}

/**
 * 미리 예약 생성 DTO
 */
export interface CreatePreReservationDto {
    startTime: string;
}

/**
 * 주차별 예약 목록 응답
 */
export interface ReservationListResponse {
    confirmed: Reservation[];
    pending: Reservation[];
}
