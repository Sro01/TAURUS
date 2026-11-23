import axios, { AxiosError } from 'axios';

/**
 * 방 전용 axios 인스턴스 (스펙 5.6)
 * - 기존 services/api.ts의 axiosClient와 달리 팀 출입증을 넣지 않고, 401에 팀 로그인을 건드리지 않는다.
 * - 경로 '/jam-rooms/:slug/...'에서 slug를 뽑아 localStorage 'jam:<slug>'의 방 출입증을 X-Jam-Token으로 넣는다.
 * - 출입증을 보낸 요청이 401이면 그 방 출입증만 지우고 JAM_TOKEN_EXPIRED_EVENT를 보낸다.
 */
const jamApi = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    timeout: 30000, // api.ts와 같은 값 (Railway 콜드 스타트)
    headers: { 'Content-Type': 'application/json' },
});

export const JAM_TOKEN_HEADER = 'X-Jam-Token';

/** 방 출입증이 만료·무효일 때 window에 보내는 이벤트. detail: JamTokenExpiredDetail */
export const JAM_TOKEN_EXPIRED_EVENT = 'jam:token-expired';

export interface JamTokenExpiredDetail {
    slug: string;
}

// ===== 방 출입증 보관 (localStorage 'jam:<slug>') =====

const jamTokenKey = (slug: string) => `jam:${slug}`;

export function getJamToken(slug: string): string | null {
    return localStorage.getItem(jamTokenKey(slug));
}

export function setJamToken(slug: string, token: string): void {
    localStorage.setItem(jamTokenKey(slug), token);
}

export function clearJamToken(slug: string): void {
    localStorage.removeItem(jamTokenKey(slug));
}

/** '/jam-rooms/<slug>...' 경로에서 slug를 뽑는다. 방 경로가 아니면 null */
function slugFromUrl(url: string | undefined): string | null {
    const match = url?.match(/^\/jam-rooms\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

/** 이름+비밀번호로 들어오기(POST /jam-rooms/:slug/participants)는 출입증 없이 보낸다 */
function isEnterRequest(method: string | undefined, url: string | undefined): boolean {
    return method?.toLowerCase() === 'post' && /^\/jam-rooms\/[^/?#]+\/participants\/?$/.test(url ?? '');
}

jamApi.interceptors.request.use((config) => {
    const slug = slugFromUrl(config.url);
    if (slug && !isEnterRequest(config.method, config.url)) {
        const token = getJamToken(slug);
        if (token) {
            config.headers[JAM_TOKEN_HEADER] = token;
        }
    }
    return config;
});

jamApi.interceptors.response.use(
    (response) => {
        if (response.data && response.data.code === 'SUCCESS') {
            return response.data.data;
        }
        return response.data;
    },
    (error: AxiosError) => {
        const sentToken = Boolean(error.config?.headers?.[JAM_TOKEN_HEADER]);
        const slug = slugFromUrl(error.config?.url);
        if (error.response?.status === 401 && sentToken && slug) {
            clearJamToken(slug);
            window.dispatchEvent(
                new CustomEvent<JamTokenExpiredDetail>(JAM_TOKEN_EXPIRED_EVENT, { detail: { slug } }),
            );
        }
        return Promise.reject(error);
    },
);

/** 서버 오류 응답 { code, message, data }의 message. 없으면 fallback */
export function getJamErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError<{ message?: string }>(error)) {
        const message = error.response?.data?.message;
        if (typeof message === 'string' && message) return message;
    }
    return fallback;
}

/** 서버 응답 상태 코드 (네트워크 오류 등은 null) */
export function getJamErrorStatus(error: unknown): number | null {
    return axios.isAxiosError(error) ? (error.response?.status ?? null) : null;
}

export { jamApi };
