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

// 응답 인터셉터: 401 시 해당 토큰 자동 제거
axiosClient.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response?.status === 401) {
            const isAdminApi = error.config?.url?.startsWith('/admin');
            sessionStorage.removeItem(isAdminApi ? ADMIN_TOKEN_KEY : TEAM_TOKEN_KEY);
        }
        return Promise.reject(error);
    },
);

export { axiosClient };
