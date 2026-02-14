/**
 * 공통 응답 래퍼
 * 모든 API 성공 응답은 이 구조를 따릅니다.
 */
export interface CommonResponseDto<T> {
    code: string;
    message: string;
    data: T;
}
