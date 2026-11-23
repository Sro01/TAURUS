import { axiosClient } from './api';
import {
    AdminSettings,
    UpdateSettingsDto,
    CreateAdminReservationDto,
    CreateAdminReservationsResult,
    AdminReservationPreview,
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
     * 관리자 예약 미리 보기 (바꾸지 않음): 건너뛸 칸, 팀 예약이 취소될 칸
     * POST /admin/reservations/preview
     */
    previewReservations: async (data: CreateAdminReservationDto): Promise<AdminReservationPreview> => {
        return await axiosClient.post('/admin/reservations/preview', data);
    },

    /**
     * 관리자 예약 생성 (강제, 여러 칸 한 번에). 이미 관리자 예약이 있는 칸은 skipped로 온다
     * POST /admin/reservations
     */
    createReservations: async (data: CreateAdminReservationDto): Promise<CreateAdminReservationsResult> => {
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

