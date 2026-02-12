export interface Team {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}

export interface Reservation {
    id: string;
    teamId?: string;
    team?: { name: string };
    startTime: string;
    endTime?: string;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'VOID' | 'CONFIRMED_ADMIN';
    type?: 'INSTANT' | 'PRE' | 'ADMIN';
    pendingCount?: number; // 주차별 조회 시 PENDING 요약용
}

export interface Week {
    id: string;
    weekNumber: number;
    startDate: string;
    endDate: string;
    status: 'PENDING' | 'OPEN' | 'CLOSED';
}

export interface AuthResponse {
    access_token: string;
    token_exp: number;
    isNewTeam?: boolean;
}

export interface ApiError {
    statusCode: number;
    message: string;
    error: string;
}
