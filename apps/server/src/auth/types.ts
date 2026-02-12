/**
 * JWT payload 및 인증된 요청 타입 정의
 * req.user에 담기는 정보의 타입 안전성을 보장
 */

/** JWT 토큰에 서명되는 payload */
export interface JwtPayload {
    /** Team UUID 또는 'admin' */
    sub: string;
    /** 팀명 또는 'admin' */
    username: string;
    /** 사용자 역할 */
    role: 'USER' | 'ADMIN';
}

/** JwtStrategy.validate()가 반환하는 객체 (= req.user) */
export interface JwtUser {
    /** Team UUID 또는 'admin' */
    id: string;
    /** 팀명 또는 'admin' */
    name: string;
    /** 사용자 역할 */
    role: 'USER' | 'ADMIN';
}
