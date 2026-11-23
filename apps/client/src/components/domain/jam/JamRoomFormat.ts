/**
 * 방 화면 문구·날짜 도우미. 날짜는 KST 'YYYY-MM-DD' 문자열을 달력 날짜로만 다룬다
 * (new Date('YYYY-MM-DD')를 쓰지 않는다 — 브라우저 시간대에 따라 하루 밀림).
 */
import dayjs from '@/utils/dayjs';
import { JAM_TIMEZONE, dayCount, dayDate, weekSlotOf } from '@/utils/jam/slots';
import type { JamDateRange, SortKey } from '@/types/jam';
import type { MainWeeksResponse } from '@/types/week';

/** 한 주 = 7일. 방은 7일(한 주) 또는 14일(두 주) */
export const DAYS_PER_WEEK = 7;

export const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

const pad2 = (n: number): string => String(n).padStart(2, '0');

const calendarDay = (date: string) => dayjs.utc(date, 'YYYY-MM-DD', true);

/** 오늘 (KST) 'YYYY-MM-DD' */
export const todayKst = (): string => dayjs().tz(JAM_TIMEZONE).format('YYYY-MM-DD');

/** 'YYYY-MM-DD' → 요일 글자 */
export const dowLabel = (date: string): string => DOW_LABELS[calendarDay(date).day()];

/** 'YYYY-MM-DD' → 일(1~31) */
export const dayOfMonth = (date: string): number => calendarDay(date).date();

/** 'YYYY-MM-DD' → '11.15' */
export const monthDay = (date: string): string => calendarDay(date).format('MM.DD');

/** '11월 26일 (목)' */
export const dateLabel = (date: string): string => `${calendarDay(date).format('M월 D일')} (${dowLabel(date)})`;

/** '11월 26일 (목) 19:00' */
export const whenLabel = (date: string, hour: number): string => `${dateLabel(date)} ${pad2(hour)}:00`;

/** '19:00' */
export const hourLabel = (hour: number): string => `${pad2(hour)}:00`;

/** 방 기간의 주 수 (1 또는 2) */
export const weekCountOf = (range: JamDateRange): number => Math.ceil(dayCount(range) / DAYS_PER_WEEK);

/** 방 안 주 weekIndex의 첫 날·마지막 날 */
function weekBounds(range: JamDateRange, weekIndex: number) {
  const first = weekIndex * DAYS_PER_WEEK;
  const last = Math.min(first + DAYS_PER_WEEK, dayCount(range)) - 1;
  return { start: dayDate(range.startDate, first), end: dayDate(range.startDate, last) };
}

/** "이번 주"/"다음 주". 서버 주차에 없는 날(지나간 주)은 null */
function weekTag(date: string, weeks: MainWeeksResponse | null): string | null {
  if (!weeks) return null;
  const slot = weekSlotOf(date, weeks);
  return slot === 'main' ? '이번 주' : slot === 'next' ? '다음 주' : null;
}

/** 주 탭 글자: 이번 주 / 다음 주, 지나간 주는 날짜 */
export function weekTabLabels(range: JamDateRange, weeks: MainWeeksResponse | null): string[] {
  return Array.from({ length: weekCountOf(range) }, (_, i) => {
    const { start, end } = weekBounds(range, i);
    return weekTag(start, weeks) ?? `${monthDay(start)} ~ ${monthDay(end)}`;
  });
}

/** 기간 문구: '이번 주 + 다음 주 · 11.15 ~ 11.28'. 지나간 주가 섞이면 날짜만 */
export function rangeLabel(range: JamDateRange, weeks: MainWeeksResponse | null): string {
  const dates = `${monthDay(range.startDate)} ~ ${monthDay(range.endDate)}`;
  const tags = Array.from({ length: weekCountOf(range) }, (_, i) => weekTag(weekBounds(range, i).start, weeks));
  if (tags.some((tag) => tag === null)) return dates;
  return `${tags.join(' + ')} · ${dates}`;
}

/** 처음 보여 줄 주: 오늘이 든 주. 기간 앞이면 첫 주, 뒤면 마지막 주 */
export function defaultWeekIndex(range: JamDateRange): number {
  const today = todayKst();
  const weekTotal = weekCountOf(range);
  if (today <= range.startDate) return 0;
  if (today > range.endDate) return weekTotal - 1;
  const offset = calendarDay(today).diff(calendarDay(range.startDate), 'day');
  return Math.min(weekTotal - 1, Math.floor(offset / DAYS_PER_WEEK));
}

/** 우선순위 정렬 3종 (정렬 시트·정렬 칩 공용) */
export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'people', label: '많은 인원 순' },
  { key: 'time', label: '빠른 시간 순' },
  { key: 'length', label: '오래 할 수 있는 순' },
];
