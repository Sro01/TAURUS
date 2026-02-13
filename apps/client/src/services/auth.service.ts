import { axiosClient } from './api';

export interface VerifyDto {
    name: string;
    password: string;
    autoRegister?: boolean;
}

export const authService = {
    /**
     * 팀 등록
     */
    register: async (dto: VerifyDto): Promise<{ id: string; name: string; message: string }> => {
        return await axiosClient.post('/auth/register', dto);
    },

    /**
     * 팀 인증 (로그인/등록)
     * - 기존 팀: 로그인
     * - 신규 팀: autoRegister=true일 경우 자동 등록
     */
    verify: async (dto: VerifyDto): Promise<{ access_token: string; isNewTeam?: boolean }> => {
        return await axiosClient.post('/auth/verify', dto);
    },
};
