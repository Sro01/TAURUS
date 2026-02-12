import { axiosClient } from './api';

export interface AdminSettings {
    maxSlotsPerWeek: number;
    maxSlotsPerDay: number;
}

export interface CreateAdminReservationDto {
    startTime: string;
    description: string;
}

export const adminService = {
    /**
     * 관리자 인증 (마스터 패스워드)
     * POST /admin/verify
     */
    verify: async (password: string): Promise<{ access_token: string }> => {
        const response = await axiosClient.post<any>('/admin/verify', { password });
        return response.data.data;
    },

    /**
     * 시스템 설정 조회
     * GET /admin/settings
     */
    getSettings: async (): Promise<AdminSettings> => {
        const response = await axiosClient.get<any>('/admin/settings');
        return response.data.data;
    },

    /**
     * 시스템 설정 변경
     * PATCH /admin/settings
     */
    updateSettings: async (settings: Partial<AdminSettings>): Promise<AdminSettings> => {
        const response = await axiosClient.patch<any>('/admin/settings', settings);
        return response.data.data;
    },

    /**
     * 관리자 예약 생성 (강제)
     * POST /admin/reservations
     */
    createReservation: async (data: CreateAdminReservationDto): Promise<any> => {
        const response = await axiosClient.post<any>('/admin/reservations', data);
        return response.data.data;
    },

    /**
     * 예약 강제 취소
     * DELETE /admin/reservations/:id
     */
    cancelReservation: async (id: string): Promise<void> => {
        await axiosClient.delete<any>(`/admin/reservations/${id}`);
    },

    /**
     * 팀 강제 삭제
     * DELETE /admin/teams/:id
     */
    deleteTeam: async (id: string): Promise<void> => {
        await axiosClient.delete<any>(`/admin/teams/${id}`);
    },
};
