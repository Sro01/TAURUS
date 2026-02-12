import { axiosClient } from './api';
import { Week } from '../types/index';

export const weekService = {
    /**
     * 메인 주차 정보 조회 (현재 활성화된 주차)
     */
    getCurrentWeek: async (): Promise<Week> => {
        const response = await axiosClient.get<any>('/weeks/main');
        // 서버 응답이 { main: Week, next: Week } 구조임
        return response.data.data.main;
    },

    /**
     * 전체 주차 목록 조회
     */
    getWeeks: async (): Promise<Week[]> => {
        const response = await axiosClient.get<any>('/weeks');
        return response.data.data;
    },
};
