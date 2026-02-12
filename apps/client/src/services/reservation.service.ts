import { axiosClient } from './api';
import { Reservation, Week } from '../types/index';

export interface CreateInstantReservationDto {
    startTime: string; // YYYY-MM-DD HH:mm
}

export interface CreatePreReservationDto {
    startTime: string; // YYYY-MM-DD HH:mm
}

interface ReservationListResponse {
    reservations: Reservation[];
    week: Week | null;
}

export const reservationService = {
    /**
     * 예약 목록 조회
     * @param weekId 특정 주차 ID (없으면 현재 주차)
     */
    getReservations: async (weekId?: string): Promise<ReservationListResponse> => {
        if (!weekId) return { reservations: [], week: null };
        const response = await axiosClient.get<any>(`/reservations/week/${weekId}`);
        const data = response.data.data;

        // 서버 응답: { confirmed: [...], pendingSummary: [{ startTime, pendingCount }] }
        // 예약 데이터 구조 변환 (teamName -> team.name)
        const confirmed = (data.confirmed || []).map((r: any) => ({
            ...r,
            team: r.teamName ? { name: r.teamName } : undefined,
            status: 'CONFIRMED'
        }));

        const pending = (data.pendingSummary || []).map((p: any, idx: number) => ({
            id: `pending-${idx}`, // 가상 ID
            startTime: p.startTime,
            status: 'PENDING',
            pendingCount: p.pendingCount,
        }));

        return {
            reservations: [...confirmed, ...pending],
            week: null // 현재 API 응답에 week 정보는 없으므로 null (필요시 추가 호출)
        };
    },

    /**
     * 내 예약 조회 (팀 토큰 필요)
     */
    // 내 예약 조회
    getMyReservations: async (): Promise<Reservation[]> => {
        const response = await axiosClient.get<any>('/reservations/me');
        return response.data.data;
    },

    /**
     * 바로 예약 생성 (팀 토큰 필요)
     */
    createInstant: async (data: CreateInstantReservationDto): Promise<Reservation> => {
        const response = await axiosClient.post<any>('/reservations/instant', data);
        return response.data.data;
    },

    /**
     * 미리 예약 생성 (팀 토큰 필요)
     */
    createPre: async (data: CreatePreReservationDto): Promise<Reservation> => {
        const response = await axiosClient.post<any>('/reservations/pre', data);
        return response.data.data;
    },

    /**
     * 예약 취소 (팀 토큰 필요)
     */
    cancel: async (id: string): Promise<void> => {
        await axiosClient.delete(`/reservations/${id}`);
    },
};
