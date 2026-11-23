import { Reservation } from './reservation';

/**
 * 시스템 설정값
 */
export interface AdminSettings {
    maxSlotsPerWeek: number;
    maxSlotsPerDay: number;
}

/**
 * 설정 변경 DTO
 */
export interface UpdateSettingsDto {
    maxSlotsPerWeek: number;
    maxSlotsPerDay: number;
}

/**
 * 관리자 우선 예약 생성 DTO (여러 칸 한 번에)
 */
export interface CreateAdminReservationDto {
    /** 칸 시작 시간들 (정시, 09~22 KST) */
    startTimes: string[];
    description?: string;
}

/** 이미 관리자 예약이 있어 건너뛴 칸 */
export interface SkippedAdminSlot {
    startTime: string;
    description: string | null;
}

/**
 * 관리자 우선 예약 생성 결과
 */
export interface CreateAdminReservationsResult {
    created: Reservation[];
    skipped: SkippedAdminSlot[];
}

/** 덮어쓰면 취소될 팀 예약 */
export interface OverwrittenTeam {
    teamName: string | null;
    /** 확정 / 미리 예약 대기 */
    status: 'CONFIRMED' | 'PENDING';
}

/** 팀 예약이 있어 관리자 예약으로 바뀔 칸 */
export interface OverwrittenSlot {
    startTime: string;
    teams: OverwrittenTeam[];
}

/**
 * 관리자 우선 예약 미리 보기 (예약 전 확인)
 */
export interface AdminReservationPreview {
    /** 새로 잡힐 칸 수 (건너뛸 칸 제외) */
    newSlotCount: number;
    skipped: SkippedAdminSlot[];
    overwritten: OverwrittenSlot[];
}
