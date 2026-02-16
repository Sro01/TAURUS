export enum WeekStatus {
    OPEN = 'OPEN',
    CLOSED = 'CLOSED',
    UPCOMING = 'UPCOMING',
}

/**
 * 주차 응답 DTO
 */
export interface Week {
    id: number;
    startDate: string;
    endDate: string;
    year: number;
    weekNumber: number;
    status: WeekStatus;
    displayName: string; // "2월 3주차" 등
}

export interface MainWeeksResponse {
    main: Week;
    next: Week;
}
