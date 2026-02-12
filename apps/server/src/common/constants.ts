/**
 * 프로젝트 전역 상수
 * 매직 스트링과 매직 넘버를 한 곳에서 관리
 */

// ── 타임존 ──────────────────────────────
export const KST = 'Asia/Seoul';

// ── 타임슬롯 규칙 ──────────────────────────
export const SLOT_START_HOUR = 9;         // 09:00 시작
export const SLOT_END_HOUR = 22;          // 22:00 마지막 슬롯 (22:00~22:50)
export const SLOT_DURATION_MIN = 50;      // 50분 진행

// ── 예약 제한 기본값 ─────────────────────────
export const DEFAULT_MAX_SLOTS_PER_WEEK = 2;
export const DEFAULT_MAX_SLOTS_PER_DAY = 1;

// ── SystemConfig 키 ─────────────────────────
export const CONFIG_KEY_MAX_SLOTS_PER_WEEK = 'MaxSlotsPerWeek';
export const CONFIG_KEY_MAX_SLOTS_PER_DAY = 'MaxSlotsPerDay';

// ── JWT 토큰 만료 ───────────────────────────
export const TEAM_TOKEN_EXPIRY = '15m';       // 팀 세션 (짧은 세션)
export const ADMIN_TOKEN_EXPIRY = '1h';       // 관리자 세션

// ── 관리자 식별자 ───────────────────────────
export const ADMIN_IDENTIFIER = 'admin';
