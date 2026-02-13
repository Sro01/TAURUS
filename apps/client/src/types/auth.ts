/**
 * 팀 등록 DTO
 */
export interface RegisterDto {
    name: string;
    password: string;
}

/**
 * 팀 로그인(인증) DTO
 */
export interface VerifyDto {
    name: string;
    password: string;
    // 미등록 팀일 경우 자동 등록 여부 (바로 예약: true, 미리 예약: false)
    autoRegister?: boolean;
}

/**
 * 관리자 인증 DTO
 */
export interface AdminVerifyDto {
    password: string;
}

/**
 * 인증 응답 (토큰)
 */
export interface AuthResponse {
    access_token: string;
}
