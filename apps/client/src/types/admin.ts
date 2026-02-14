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
 * 관리자 우선 예약 생성 DTO
 */
export interface CreateAdminReservationDto {
    startTime: string;
    description?: string;
}
