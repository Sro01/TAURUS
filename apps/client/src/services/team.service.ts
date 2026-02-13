import { axiosClient } from './api';
import { Team, UpdateNameDto, UpdatePasswordDto } from '../types/team';

export const teamService = {
    /**
     * 전체 팀 목록 조회 (검색 가능)
     */
    getTeams: async (search?: string): Promise<Team[]> => {
        const params = search ? { search } : {};
        // Interceptor에서 이미 data.data를 반환하므로 바로 리턴
        return await axiosClient.get('/teams', { params });
    },

    // 내 팀 상세 조회
    getMe: async (): Promise<Team> => {
        return await axiosClient.get('/teams/me');
    },

    // 내 팀 이름 수정
    updateName: async (name: string): Promise<{ message: string }> => {
        const payload: UpdateNameDto = { name };
        return await axiosClient.patch('/teams/me/name', payload);
    },

    // 내 팀 비밀번호 수정
    updatePassword: async (currentPassword: string, password: string): Promise<{ message: string; access_token: string }> => {
        const payload: UpdatePasswordDto = { currentPassword, password };
        return await axiosClient.patch('/teams/me/password', payload);
    },

    // 내 팀 탈퇴
    deleteMe: async (): Promise<{ message: string }> => {
        return await axiosClient.delete('/teams/me');
    },
};

