import { axiosClient } from './api';
import {
    AdminSettings,
    UpdateSettingsDto,
    CreateAdminReservationDto
} from '../types/admin';
import { Reservation } from '../types/reservation';

export const adminService = {
    /**
     * 관리자 인증 (마스터 패스워드)
     * POST /admin/verify
     */
    verify: async (password: string): Promise<{ access_token: string }> => {
        // Interceptor가 data.data를 반환함
        return await axiosClient.post('/admin/verify', { password });
    },

    /**
     * 시스템 설정 조회
     * GET /admin/settings
     */
    getSettings: async (): Promise<AdminSettings> => {
        return await axiosClient.get('/admin/settings');
    },

    /**
     * 시스템 설정 변경
     * PATCH /admin/settings
     */
    updateSettings: async (settings: UpdateSettingsDto): Promise<AdminSettings> => {
        return await axiosClient.patch('/admin/settings', settings);
    },

    /**
     * 관리자 예약 생성 (강제)
     * POST /admin/reservations
     */
    createReservation: async (data: CreateAdminReservationDto): Promise<Reservation> => {
        return await axiosClient.post('/admin/reservations', data);
    },

    /**
     * 특정 팀 예약 이력 조회
     * GET /admin/reservations/team/:teamId
     */
    getReservationsByTeam: async (teamId: string): Promise<Reservation[]> => {
        return await axiosClient.get(`/admin/reservations/team/${teamId}`);
    },

    /**
     * 예약 강제 취소
     * DELETE /admin/reservations/:id
     */
    cancelReservation: async (id: string): Promise<void> => {
        await axiosClient.delete(`/admin/reservations/${id}`);
    },

    /**
     * 팀 강제 삭제
     * DELETE /admin/teams/:id
     */
    deleteTeam: async (id: string): Promise<void> => {
        await axiosClient.delete(`/admin/teams/${id}`);
    },
};

