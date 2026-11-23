/**
 * 관리자 예약: 날짜 여러 개 × 시간 범위 여러 개 → 예약할 칸 시작 시각들.
 * 칸은 NN:00 ~ NN:50, 시작 시각은 SLOT_FIRST_HOUR ~ SLOT_LAST_HOUR 정시.
 */
import dayjs from './dayjs';
import { JAM_TIMEZONE, SLOT_DURATION_MIN, SLOT_FIRST_HOUR, SLOT_HOURS, SLOT_LAST_HOUR } from './jam/slots';

/** 이어진 칸 묶음. endHour는 마지막 칸의 시작 시각 (endHour:50에 끝남) */
export interface TimeRange {
  startHour: number;
  endHour: number;
}

/** 첫 줄 시각 (예전 드롭다운 기본값과 같은 09:00) */
const DEFAULT_START_HOUR = SLOT_FIRST_HOUR;

const pad2 = (n: number): string => String(n).padStart(2, '0');

export const startLabel = (hour: number): string => `${pad2(hour)}:00`;
export const endLabel = (hour: number): string => `${pad2(hour)}:${pad2(SLOT_DURATION_MIN)}`;
export const rangeLabel = (range: TimeRange): string => `${startLabel(range.startHour)} ~ ${endLabel(range.endHour)}`;

/** 범위들이 덮는 칸 시작 시각 (겹침 제거, 오름차순) */
export function hoursOf(ranges: TimeRange[]): number[] {
  const hours = new Set<number>();
  for (const { startHour, endHour } of ranges) {
    for (let h = startHour; h <= endHour; h++) hours.add(h);
  }
  return [...hours].sort((a, b) => a - b);
}

/** 날짜('YYYY-MM-DD') × 시작 시각 조합을 KST ISO 문자열로 (오름차순) */
export function buildAdminStartTimes(dates: string[], hours: number[]): string[] {
  return [...dates].sort().flatMap((date) =>
    hours.map((hour) => dayjs.tz(`${date} ${startLabel(hour)}:00`, JAM_TIMEZONE).format()),
  );
}

/** "시간 추가"로 새로 넣을 한 칸: 마지막 줄 다음 시각, 없으면 비어 있는 가장 이른 시각 */
export function nextRange(ranges: TimeRange[]): TimeRange {
  const last = ranges[ranges.length - 1];
  if (!last) return { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_START_HOUR };

  if (last.endHour < SLOT_LAST_HOUR) {
    const hour = last.endHour + 1;
    return { startHour: hour, endHour: hour };
  }

  const taken = new Set(hoursOf(ranges));
  const free = SLOT_HOURS.find((h) => !taken.has(h)) ?? SLOT_FIRST_HOUR;
  return { startHour: free, endHour: free };
}
