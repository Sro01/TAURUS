import axios from 'axios';

/** Axios 인스턴스 */
const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    timeout: 5000,
    headers: { 'Content-Type': 'application/json' },
});

/** 토큰 저장 키 */
export const TEAM_TOKEN_KEY = 'team_token';
export const ADMIN_TOKEN_KEY = 'admin_token';

// 요청 인터셉터: 경로에 따라 적절한 토큰 자동 주입
axiosClient.interceptors.request.use((config) => {
    const isAdminApi = config.url?.startsWith('/admin');
    const token = isAdminApi
        ? sessionStorage.getItem(ADMIN_TOKEN_KEY)
        : sessionStorage.getItem(TEAM_TOKEN_KEY);

    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

// Race Condition 방지를 위한 전역 플래그
let isHandling401 = false;

// 응답 인터셉터: 데이터 언래핑 및 401 토큰 처리
axiosClient.interceptors.response.use(
    (response) => {
        if (response.data && response.data.code === 'SUCCESS') {
            return response.data.data;
        }
        return response.data;
    },
    (error) => {
        if (error.response?.status === 401 && !isHandling401) {
            isHandling401 = true;

            const url = error.config.url || '';
            const isAdminApi = url.startsWith('/admin');

            if (isAdminApi) {
                // 관리자 토큰 만료 처리
                const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
                if (token) {
                    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
                    window.dispatchEvent(new CustomEvent('auth:token-expired', {
                        detail: { type: 'admin' }
                    }));
                }
            } else {
                // 팀 토큰 만료 처리
                const token = sessionStorage.getItem(TEAM_TOKEN_KEY);
                if (token) {
                    sessionStorage.removeItem(TEAM_TOKEN_KEY);
                    sessionStorage.removeItem('TEAM_NAME');
                    sessionStorage.removeItem('TEAM_PASSWORD');
                    window.dispatchEvent(new CustomEvent('auth:token-expired', {
                        detail: { type: 'team' }
                    }));
                }
            }

            // 1초 후 플래그 해제 (Debounce)
            setTimeout(() => { isHandling401 = false; }, 1000);
        }
        return Promise.reject(error);
    },
);

export { axiosClient };
