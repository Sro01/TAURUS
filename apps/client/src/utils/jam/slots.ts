/**
 * 시간 칸 규칙 (스펙 3.2, 5.3) — 09~22시 정시 시작 14칸 상수는 화면에서 이 파일에만 둔다.
 * 날짜는 KST 'YYYY-MM-DD' 문자열. new Date('YYYY-MM-DD')를 쓰지 말고 utils/dayjs의 tz를 쓴다.
 */
import dayjs from '../dayjs';
import type { JamDateRange, ReservationKind, SlotGrid, SlotRef, WeekSlot } from '../../types/jam';
import { WeekStatus, type MainWeeksResponse } from '../../types/week';

/** 첫 칸 시작 시각 (서버 SLOT_START_HOUR와 같음) */
export const SLOT_FIRST_HOUR = 9;
/** 하루 칸 수: 09, 10, …, 22시 */
export const SLOT_COUNT = 14;
/** 14비트 전부 켠 값 (16383). 서버 검사 범위 0 ≤ v < 2^14 */
export const FULL_DAY_MASK = (1 << SLOT_COUNT) - 1;
/** 날짜 계산 시간대 */
export const JAM_TIMEZONE = 'Asia/Seoul';

const DATE_FORMAT = 'YYYY-MM-DD';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const pad2 = (n: number): string => String(n).padStart(2, '0');

/** 한 주 = 7일. 방은 7일(한 주) 또는 14일(두 주) */
export const DAYS_PER_WEEK = 7;

/**
 * 'YYYY-MM-DD'를 달력 날짜로만 다루는 UTC 자정 (브라우저 시간대와 무관).
 * 형식이 맞지 않으면 유효하지 않은 값(isValid() === false)을 돌려준다.
 */
export const calendarDay = (date: string) => (DATE_PATTERN.test(date) ? dayjs.utc(date) : dayjs.utc(Number.NaN));

/** 오늘 (KST) 'YYYY-MM-DD' */
export const todayKst = (): string => dayjs().tz(JAM_TIMEZONE).format(DATE_FORMAT);

/** 기간 일수(days) 안에서 주 weekIndex(0부터)에 속한 날짜 인덱스들 (마지막 주는 7일보다 짧을 수 있음) */
export function weekDayIndexes(days: number, weekIndex: number): number[] {
    const first = weekIndex * DAYS_PER_WEEK;
    return Array.from({ length: Math.max(0, Math.min(DAYS_PER_WEEK, days - first)) }, (_, i) => first + i);
}

/** 기간의 주 수 (7일 → 1, 14일 → 2) */
export const weekCountOf = (range: JamDateRange): number => Math.ceil(dayCount(range) / DAYS_PER_WEEK);

/** 시각(9~22) → 시간 인덱스(0~13). 범위 밖이면 -1 */
export function hourToIndex(hour: number): number {
    const index = hour - SLOT_FIRST_HOUR;
    return Number.isInteger(index) && index >= 0 && index < SLOT_COUNT ? index : -1;
}

/** 시간 인덱스(0~13) → 시각(9~22) */
export function indexToHour(hourIndex: number): number {
    return SLOT_FIRST_HOUR + hourIndex;
}

/** 하루 값(14비트)에서 그 칸이 켜졌는지 */
export function isSlotOn(mask: number, hourIndex: number): boolean {
    if (hourIndex < 0 || hourIndex >= SLOT_COUNT) return false;
    return ((mask >> hourIndex) & 1) === 1;
}

/** 하루 값(14비트)에서 그 칸을 켜거나 끈 새 값 */
export function setSlot(mask: number, hourIndex: number, on: boolean): number {
    if (hourIndex < 0 || hourIndex >= SLOT_COUNT) return mask;
    const bit = 1 << hourIndex;
    return on ? mask | bit : mask & ~bit;
}

/** 켜진 칸 수 합계 (모든 날짜). "되는 시간 N칸" 표시용 */
export function countOnSlots(slots: number[]): number {
    let total = 0;
    for (const mask of slots) {
        for (let h = 0; h < SLOT_COUNT; h++) {
            if (isSlotOn(mask, h)) total++;
        }
    }
    return total;
}

/** slots(날짜마다 14비트) → [dayIndex][hourIndex] boolean 격자 */
export function slotsToGrid(slots: number[]): SlotGrid<boolean> {
    return slots.map((mask) => Array.from({ length: SLOT_COUNT }, (_, h) => isSlotOn(mask, h)));
}

/** [dayIndex][hourIndex] boolean 격자 → slots(날짜마다 14비트). 저장(PUT) 직전에 쓴다 */
export function gridToSlots(grid: SlotGrid<boolean>): number[] {
    return grid.map((row) => {
        let mask = 0;
        for (let h = 0; h < SLOT_COUNT; h++) {
            if (row[h]) mask |= 1 << h;
        }
        return mask;
    });
}

/** 기간 일수 (startDate~endDate 양 끝 포함). 방은 7 또는 14 */
export function dayCount(range: JamDateRange): number {
    return calendarDay(range.endDate).diff(calendarDay(range.startDate), 'day') + 1;
}

/** startDate + dayIndex일 → 'YYYY-MM-DD' */
export function dayDate(startDate: string, dayIndex: number): string {
    return calendarDay(startDate).add(dayIndex, 'day').format(DATE_FORMAT);
}

/** 'YYYY-MM-DD' → 기간 안 날짜 인덱스. 기간 밖이면 -1 */
export function dateToDayIndex(range: JamDateRange, date: string): number {
    const target = calendarDay(date);
    if (!target.isValid()) return -1;
    const index = target.diff(calendarDay(range.startDate), 'day');
    return index >= 0 && index < dayCount(range) ? index : -1;
}

/** 칸 시작 시각 ISO 문자열 (예: '2026-11-26T20:00:00+09:00'). initiateReservation에 넘긴다 */
export function slotStartIso(startDate: string, ref: SlotRef): string {
    const date = dayDate(startDate, ref.dayIndex);
    return dayjs.tz(`${date} ${pad2(indexToHour(ref.hourIndex))}:00:00`, JAM_TIMEZONE).format();
}

/** 서버 시각(+09:00 ISO 등) → KST 날짜 'YYYY-MM-DD'. 브라우저 시간대와 무관 */
export const kstDate = (iso: string): string => dayjs(iso).tz(JAM_TIMEZONE).format(DATE_FORMAT);

/**
 * 날짜가 서버 주차의 main/next 중 어디에 속하는지 (날짜 범위로 판단). 둘 다 아니면 null.
 * 화면의 "이번 주 / 다음 주" 표시용. weeks의 startDate·endDate는 '+09:00' ISO 문자열.
 * 양 끝 날짜 포함 (endDate는 토요일 23:59:59.999).
 */
export function weekSlotOf(date: string, weeks: MainWeeksResponse): WeekSlot | null {
    // 'YYYY-MM-DD' 문자열은 사전순 비교가 날짜순과 같다
    for (const slot of ['main', 'next'] as const) {
        const week = weeks[slot];
        if (date >= kstDate(week.startDate) && date <= kstDate(week.endDate)) return slot;
    }
    return null;
}

/**
 * 예약 버튼 종류 (스펙 5.3, 5.4-2): 날짜가 main 주차이고 main.status === OPEN → 'instant',
 * next 주차이고 next.status === UPCOMING → 'pre', 그 외 'none'.
 */
export function reservationKindOf(date: string, weeks: MainWeeksResponse): ReservationKind {
    const slot = weekSlotOf(date, weeks);
    if (slot === 'main' && weeks.main.status === WeekStatus.OPEN) return 'instant';
    if (slot === 'next' && weeks.next.status === WeekStatus.UPCOMING) return 'pre';
    return 'none';
}
