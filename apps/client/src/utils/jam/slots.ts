/**
 * 시간 칸 규칙 (스펙 3.2, 5.3) — 09~22시 정시 시작 14칸 상수는 화면에서 이 파일에만 둔다.
 * 날짜는 KST 'YYYY-MM-DD' 문자열. new Date('YYYY-MM-DD')를 쓰지 말고 utils/dayjs의 tz를 쓴다.
 * 본문은 utils/jam 담당이 채운다 (지금은 시그니처만).
 */
import type { JamDateRange, ReservationKind, SlotGrid, SlotRef, WeekSlot } from '../../types/jam';
import type { MainWeeksResponse } from '../../types/week';

/** 첫 칸 시작 시각 (서버 SLOT_START_HOUR와 같음) */
export const SLOT_FIRST_HOUR = 9;
/** 하루 칸 수: 09, 10, …, 22시 */
export const SLOT_COUNT = 14;
/** 14비트 전부 켠 값 (16383). 서버 검사 범위 0 ≤ v < 2^14 */
export const FULL_DAY_MASK = (1 << SLOT_COUNT) - 1;
/** 날짜 계산 시간대 */
export const JAM_TIMEZONE = 'Asia/Seoul';

const notImplemented = (): never => {
    throw new Error('not implemented');
};

/** 시각(9~22) → 시간 인덱스(0~13). 범위 밖이면 -1 */
export function hourToIndex(hour: number): number {
    void hour;
    return notImplemented();
}

/** 시간 인덱스(0~13) → 시각(9~22) */
export function indexToHour(hourIndex: number): number {
    void hourIndex;
    return notImplemented();
}

/** 하루 값(14비트)에서 그 칸이 켜졌는지 */
export function isSlotOn(mask: number, hourIndex: number): boolean {
    void mask; void hourIndex;
    return notImplemented();
}

/** 하루 값(14비트)에서 그 칸을 켜거나 끈 새 값 */
export function setSlot(mask: number, hourIndex: number, on: boolean): number {
    void mask; void hourIndex; void on;
    return notImplemented();
}

/** 켜진 칸 수 합계 (모든 날짜). "되는 시간 N칸" 표시용 */
export function countOnSlots(slots: number[]): number {
    void slots;
    return notImplemented();
}

/** slots(날짜마다 14비트) → [dayIndex][hourIndex] boolean 격자 */
export function slotsToGrid(slots: number[]): SlotGrid<boolean> {
    void slots;
    return notImplemented();
}

/** [dayIndex][hourIndex] boolean 격자 → slots(날짜마다 14비트). 저장(PUT) 직전에 쓴다 */
export function gridToSlots(grid: SlotGrid<boolean>): number[] {
    void grid;
    return notImplemented();
}

/** 기간 일수 (startDate~endDate 양 끝 포함). 방은 7 또는 14 */
export function dayCount(range: JamDateRange): number {
    void range;
    return notImplemented();
}

/** startDate + dayIndex일 → 'YYYY-MM-DD' */
export function dayDate(startDate: string, dayIndex: number): string {
    void startDate; void dayIndex;
    return notImplemented();
}

/** 'YYYY-MM-DD' → 기간 안 날짜 인덱스. 기간 밖이면 -1 */
export function dateToDayIndex(range: JamDateRange, date: string): number {
    void range; void date;
    return notImplemented();
}

/** 칸 시작 시각 ISO 문자열 (예: '2026-11-26T20:00:00+09:00'). initiateReservation에 넘긴다 */
export function slotStartIso(startDate: string, ref: SlotRef): string {
    void startDate; void ref;
    return notImplemented();
}

/**
 * 날짜가 서버 주차의 main/next 중 어디에 속하는지 (날짜 범위로 판단). 둘 다 아니면 null.
 * 화면의 "이번 주 / 다음 주" 표시용. weeks의 startDate·endDate는 '+09:00' ISO 문자열.
 */
export function weekSlotOf(date: string, weeks: MainWeeksResponse): WeekSlot | null {
    void date; void weeks;
    return notImplemented();
}

/**
 * 예약 버튼 종류 (스펙 5.3, 5.4-2): 날짜가 main 주차이고 main.status === OPEN → 'instant',
 * next 주차이고 next.status === UPCOMING → 'pre', 그 외 'none'.
 */
export function reservationKindOf(date: string, weeks: MainWeeksResponse): ReservationKind {
    void date; void weeks;
    return notImplemented();
}
