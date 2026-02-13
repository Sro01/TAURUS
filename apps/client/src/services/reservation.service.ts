import { axiosClient } from './api';
import {
    Reservation,
    ReservationListResponse,
    CreateInstantReservationDto,
    CreatePreReservationDto
} from '../types/reservation';

export const reservationService = {
    /**
     * 예약 목록 조회
     * @param weekId 특정 주차 ID (없으면 현재 주차)
     */
    getReservations: async (weekId?: string): Promise<ReservationListResponse> => {
        if (!weekId) return { confirmed: [], pending: [] };
        // Interceptor가 data.data를 반환함
        // 서버 응답: { confirmed: Reservation[], pending: Reservation[] }
        return await axiosClient.get(`/reservations/week/${weekId}`);
    },

    /**
     * 내 예약 조회 (팀 토큰 필요)
     */
    getMyReservations: async (): Promise<Reservation[]> => {
        return await axiosClient.get('/reservations/me');
    },

    /**
     * 바로 예약 생성 (팀 토큰 필요)
     */
    createInstant: async (data: CreateInstantReservationDto): Promise<Reservation> => {
        return await axiosClient.post('/reservations/instant', data);
    },

    /**
     * 미리 예약 생성 (팀 토큰 필요)
     */
    createPre: async (data: CreatePreReservationDto): Promise<Reservation> => {
        return await axiosClient.post('/reservations/pre', data);
    },

    /**
     * 예약 취소 (팀 토큰 필요)
     */
    cancel: async (id: string): Promise<{ message: string }> => {
        return await axiosClient.delete(`/reservations/${id}`);
    },
};

