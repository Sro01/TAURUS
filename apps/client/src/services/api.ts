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

// 응답 인터셉터: 데이터 언래핑 및 401 토큰 처리
axiosClient.interceptors.response.use(
    (response) => {
        // 서버가 { code, message, data } 형태로 응답하면 data.data(순수 데이터)만 반환
        if (response.data && response.data.code === 'SUCCESS') {
            return response.data.data;
        }
        return response.data;
    },
    (error) => {
        if (error.response?.status === 401) {
            const isAdminApi = error.config?.url?.startsWith('/admin');
            if (isAdminApi) {
                sessionStorage.removeItem(ADMIN_TOKEN_KEY);
            } else {
                sessionStorage.removeItem(TEAM_TOKEN_KEY);
                sessionStorage.removeItem('TEAM_NAME');
                sessionStorage.removeItem('TEAM_PASSWORD');
            }
            // window.location.reload(); // 필요 시 리로드
        }
        return Promise.reject(error);
    },
);

export { axiosClient };
