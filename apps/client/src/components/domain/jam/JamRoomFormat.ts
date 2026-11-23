/**
 * 방 화면 글자 만들기. 날짜 계산은 utils/jam/slots.ts에 있고, 여기는 문구만 만든다.
 */
import type { JamDateRange, SortKey } from '@/types/jam';
import type { MainWeeksResponse } from '@/types/week';
import {
  calendarDay,
  dateToDayIndex,
  dayDate,
  todayKst,
  weekCountOf,
  weekDayIndexes,
  weekSlotOf,
  dayCount,
  DAYS_PER_WEEK,
} from '@/utils/jam/slots';

export const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 9 → '09' */
export const padHour = (hour: number): string => String(hour).padStart(2, '0');

/** 'YYYY-MM-DD' → 요일 글자 */
export const dowLabel = (date: string): string => DOW_LABELS[calendarDay(date).day()];

/** 'YYYY-MM-DD' → 일(1~31) */
export const dayOfMonth = (date: string): number => calendarDay(date).date();

/** 'YYYY-MM-DD' → '11.15' */
export const monthDay = (date: string): string => calendarDay(date).format('MM.DD');

/** '11월 26일 (목)' */
export const dateLabel = (date: string): string => `${calendarDay(date).format('M월 D일')} (${dowLabel(date)})`;

/** '19:00' */
export const hourLabel = (hour: number): string => `${padHour(hour)}:00`;

/** '11월 26일 (목) 19:00' */
export const whenLabel = (date: string, hour: number): string => `${dateLabel(date)} ${hourLabel(hour)}`;

/** "이번 주"/"다음 주". 서버 주차에 없는 날(지나간 주)은 null */
export function weekTag(date: string, weeks: MainWeeksResponse | null): string | null {
  if (!weeks) return null;
  const slot = weekSlotOf(date, weeks);
  return slot === 'main' ? '이번 주' : slot === 'next' ? '다음 주' : null;
}

/** 주 탭 글자: 이번 주 / 다음 주, 지나간 주는 날짜 */
export function weekTabLabels(range: JamDateRange, weeks: MainWeeksResponse | null): string[] {
  return Array.from({ length: weekCountOf(range) }, (_, i) => {
    const indexes = weekDayIndexes(dayCount(range), i);
    const start = dayDate(range.startDate, indexes[0]);
    const end = dayDate(range.startDate, indexes[indexes.length - 1]);
    return weekTag(start, weeks) ?? `${monthDay(start)} ~ ${monthDay(end)}`;
  });
}

/** 기간 문구: '이번 주 + 다음 주 · 11.15 ~ 11.28'. 지나간 주가 섞이면 날짜만 */
export function rangeLabel(range: JamDateRange, weeks: MainWeeksResponse | null): string {
  const dates = `${monthDay(range.startDate)} ~ ${monthDay(range.endDate)}`;
  const tags = Array.from({ length: weekCountOf(range) }, (_, i) =>
    weekTag(dayDate(range.startDate, i * DAYS_PER_WEEK), weeks),
  );
  if (tags.some((tag) => tag === null)) return dates;
  return `${tags.join(' + ')} · ${dates}`;
}

/** 처음 보여 줄 주: 오늘이 든 주. 기간 앞이면 첫 주, 뒤면 마지막 주 */
export function defaultWeekIndex(range: JamDateRange): number {
  const today = todayKst();
  const lastWeek = weekCountOf(range) - 1;
  if (today <= range.startDate) return 0;
  if (today > range.endDate) return lastWeek;
  return Math.min(lastWeek, Math.floor(dateToDayIndex(range, today) / DAYS_PER_WEEK));
}

/** 우선순위 정렬 3종 (정렬 시트·정렬 칩 공용) */
export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'people', label: '많은 인원 순' },
  { key: 'time', label: '빠른 시간 순' },
  { key: 'length', label: '오래 할 수 있는 순' },
];
