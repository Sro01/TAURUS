import { axiosClient } from './api';
import { Team } from '../types/index';

export interface UpdateTeamDto {
    name?: string;
    password?: string;
}

export const teamService = {
    /**
     * 전체 팀 목록 조회 (검색 가능)
     */
    getTeams: async (keyword?: string): Promise<Team[]> => {
        const params = keyword ? { keyword } : {};
        const response = await axiosClient.get<any>('/teams', { params });
        return response.data.data;
    },

    // 내 팀 상세 조회
    getMe: async (): Promise<Team> => {
        const response = await axiosClient.get<any>('/teams/me');
        return response.data.data;
    },

    // 내 팀 이름 수정
    updateName: async (name: string): Promise<Team> => {
        const response = await axiosClient.patch<any>('/teams/me/name', { name });
        return response.data.data;
    },

    // 내 팀 비밀번호 수정
    updatePassword: async (password: string): Promise<void> => {
        const response = await axiosClient.patch<any>('/teams/me/password', { password });
        return response.data.data;
    },

    // 내 팀 탈퇴
    deleteMe: async (): Promise<void> => {
        const response = await axiosClient.delete<any>('/teams/me');
        return response.data.data;
    },
};
