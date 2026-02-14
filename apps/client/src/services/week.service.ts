import { axiosClient } from './api';
import { Week } from '../types/week';

export const weekService = {
    /**
     * 메인 주차 정보 조회 (현재 활성화된 주차)
     */
    getCurrentWeek: async (): Promise<Week> => {
        // Interceptor가 data.data까지 벗겨줌 -> { main: Week, next: Week }
        const data: any = await axiosClient.get('/weeks/main');
        return data.main;
    },

    /**
     * 전체 주차 목록 조회
     */
    getWeeks: async (): Promise<Week[]> => {
        return await axiosClient.get('/weeks');
    },
};

