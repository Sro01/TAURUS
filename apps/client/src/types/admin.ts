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
