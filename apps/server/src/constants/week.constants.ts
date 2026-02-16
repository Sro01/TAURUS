/**
 * 주차 시스템 관련 상수
 */

// ────────────────────────────────────────────────
// 주차 구조
// ────────────────────────────────────────────────
export const DAYS_PER_WEEK = 7;
export const MAX_WEEKS_PER_YEAR = 53;
export const WEEK_START_DAY = 0; // 0=일요일 (미국식)
export const WEEK_END_DAY = 6;   // 6=토요일

// ────────────────────────────────────────────────
// 주차 전환 설정
// ────────────────────────────────────────────────
export const WEEK_ROTATION_DAY = 0;     // 0=일요일
export const WEEK_ROTATION_HOUR = 0;    // 00시
export const WEEK_ROTATION_MINUTE = 0;  // 00분

/**
 * Cron 표현식 생성
 * 형식: 분 시 일 월 요일
 */
export const WEEK_ROTATION_CRON = `${WEEK_ROTATION_MINUTE} ${WEEK_ROTATION_HOUR} * * ${WEEK_ROTATION_DAY}`;

// ────────────────────────────────────────────────
// 표기 설정
// ────────────────────────────────────────────────
/**
 * 주차 표기 기준 요일
 * 해당 요일이 속한 달을 기준으로 "N월 N주차" 계산
 * 예: 수요일(3)이 2월이면 "2월 N주차"
 */
export const WEEK_DISPLAY_STANDARD_DAY = 3; // 3=수요일

// ────────────────────────────────────────────────
// 시스템 설정
// ────────────────────────────────────────────────
export const TIMEZONE = 'Asia/Seoul';

/**
 * 요일 이름 매핑 (디버깅용)
 */
export const DAY_NAMES = {
    0: '일요일',
    1: '월요일',
    2: '화요일',
    3: '수요일',
    4: '목요일',
    5: '금요일',
    6: '토요일',
} as const;

/**
 * 주차 상태 설명
 */
export const WEEK_STATUS_DESCRIPTION = {
    OPEN: '바로 예약 가능 (현재 주차)',
    CLOSED: '예약 마감 (과거 주차)',
    UPCOMING: '미리 예약 기간 (다음 주차)',
} as const;
