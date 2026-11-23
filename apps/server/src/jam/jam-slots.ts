import dayjs from '../common/utils/dayjs';
import { KST, SLOT_END_HOUR, SLOT_START_HOUR } from '../common/constants';

// 합주 방 날짜·칸 규칙 (스펙 3.2, 4.8). 순수 함수만 둔다.
// 날짜 변환은 이 파일에만 둔다. 주 계산은 WeekService가 하고 여기서는 받은 날짜를 바꾸기만 한다.

/** 하루 칸 수: 09~22시 정시 시작 14칸 */
export const SLOT_COUNT = SLOT_END_HOUR - SLOT_START_HOUR + 1;

/** 하루 가능 칸 값의 상한(제외): 2^14 */
export const SLOT_VALUE_LIMIT = 1 << SLOT_COUNT;

const DAY_MS = 24 * 60 * 60 * 1000;

/** KST 시각 → @db.Date에 넣을 값 (그 KST 날짜의 UTC 0시) */
export function toDbDate(kst: dayjs.Dayjs): Date {
  return new Date(kst.tz(KST).format('YYYY-MM-DD') + 'T00:00:00Z');
}

/** @db.Date 값 → 'YYYY-MM-DD' (KST 날짜) */
export function fromDbDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 오늘 KST 날짜 'YYYY-MM-DD' */
export function todayKst(now: dayjs.Dayjs = dayjs()): string {
  return now.tz(KST).format('YYYY-MM-DD');
}

/** 기간 일수 (7 또는 14) */
export function dayCount(startDate: Date, endDate: Date): number {
  return Math.round((endDate.getTime() - startDate.getTime()) / DAY_MS) + 1;
}

/** 끝난 방: 오늘(KST) > 기간 마지막 날 */
export function isEnded(endDate: Date, today: string = todayKst()): boolean {
  return today > fromDbDate(endDate);
}

/** 지난 방 지우기 기준: 이 날짜보다 endDate가 이르면 지움 (오늘 - 7일) */
export function expiredRoomCutoff(today: string = todayKst()): Date {
  return toDbDate(dayjs.tz(today, KST).subtract(7, 'day'));
}

/** 방 출입증 만료 시각(초): 기간 마지막 날 + 8일 0시 KST */
export function jamTokenExpiresAt(endDate: Date): number {
  return dayjs.tz(fromDbDate(endDate), KST).add(8, 'day').unix();
}

/** 새 참여자의 빈 칸 */
export function emptySlots(days: number): number[] {
  return new Array<number>(days).fill(0);
}

/** 가능 칸 배열 검사. 문제 없으면 null, 있으면 오류 문구 */
export function slotsError(slots: number[], days: number): string | null {
  if (slots.length !== days) {
    return `가능 시간은 ${days}일치를 보내야 해요`;
  }
  const valid = slots.every(
    (v) => Number.isInteger(v) && v >= 0 && v < SLOT_VALUE_LIMIT,
  );
  return valid ? null : '가능 시간 값이 올바르지 않아요';
}
