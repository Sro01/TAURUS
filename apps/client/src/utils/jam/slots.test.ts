import { describe, it, expect } from 'vitest';
import {
    FULL_DAY_MASK,
    SLOT_COUNT,
    countOnSlots,
    dateToDayIndex,
    dayCount,
    dayDate,
    gridToSlots,
    hourToIndex,
    indexToHour,
    isSlotOn,
    reservationKindOf,
    setSlot,
    slotStartIso,
    slotsToGrid,
    weekSlotOf,
} from './slots';
import { WeekStatus, type MainWeeksResponse, type Week } from '../../types/week';

const WEEK1 = { startDate: '2026-11-15', endDate: '2026-11-21' };
const BOTH = { startDate: '2026-11-15', endDate: '2026-11-28' };

describe('비트 변환', () => {
    it('상수', () => {
        expect(SLOT_COUNT).toBe(14);
        expect(FULL_DAY_MASK).toBe(16383);
    });

    it('시각 <-> 인덱스, 범위 밖은 -1', () => {
        expect(hourToIndex(9)).toBe(0);
        expect(hourToIndex(22)).toBe(13);
        expect(hourToIndex(8)).toBe(-1);
        expect(hourToIndex(23)).toBe(-1);
        expect(hourToIndex(9.5)).toBe(-1);
        expect(indexToHour(0)).toBe(9);
        expect(indexToHour(13)).toBe(22);
    });

    it('비트 0 = 09시, 비트 13 = 22시', () => {
        expect(isSlotOn(0b1, 0)).toBe(true);
        expect(isSlotOn(0b1, 1)).toBe(false);
        expect(isSlotOn(1 << 13, 13)).toBe(true);
        expect(isSlotOn(FULL_DAY_MASK, 14)).toBe(false);
        expect(isSlotOn(FULL_DAY_MASK, -1)).toBe(false);
    });

    it('setSlot 켜기·끄기·범위 밖', () => {
        expect(setSlot(0, 3, true)).toBe(8);
        expect(setSlot(8, 3, false)).toBe(0);
        expect(setSlot(8, 3, true)).toBe(8);
        expect(setSlot(FULL_DAY_MASK, 13, false)).toBe(FULL_DAY_MASK - (1 << 13));
        expect(setSlot(5, 14, true)).toBe(5);
    });

    it('countOnSlots는 모든 날짜의 켜진 칸 합', () => {
        expect(countOnSlots([])).toBe(0);
        expect(countOnSlots([0b101, FULL_DAY_MASK, 0])).toBe(2 + 14);
    });

    it('slotsToGrid <-> gridToSlots 왕복', () => {
        const slots = [0, 1, 1 << 13, FULL_DAY_MASK, 0b10110];
        const grid = slotsToGrid(slots);
        expect(grid).toHaveLength(5);
        expect(grid[0]).toHaveLength(14);
        expect(grid[1][0]).toBe(true);
        expect(grid[2][13]).toBe(true);
        expect(grid[2][12]).toBe(false);
        expect(gridToSlots(grid)).toEqual(slots);
    });
});

describe('날짜 인덱스 (KST 문자열)', () => {
    it('기간 일수: 7일·14일, 양 끝 포함', () => {
        expect(dayCount(WEEK1)).toBe(7);
        expect(dayCount(BOTH)).toBe(14);
    });

    it('dayDate는 월·연도 경계를 넘는다', () => {
        expect(dayDate('2026-11-15', 0)).toBe('2026-11-15');
        expect(dayDate('2026-11-15', 13)).toBe('2026-11-28');
        expect(dayDate('2026-12-27', 5)).toBe('2027-01-01');
    });

    it('dateToDayIndex: 안쪽 0~13, 밖은 -1', () => {
        expect(dateToDayIndex(BOTH, '2026-11-15')).toBe(0);
        expect(dateToDayIndex(BOTH, '2026-11-21')).toBe(6);
        expect(dateToDayIndex(BOTH, '2026-11-22')).toBe(7);
        expect(dateToDayIndex(BOTH, '2026-11-28')).toBe(13);
        expect(dateToDayIndex(BOTH, '2026-11-14')).toBe(-1);
        expect(dateToDayIndex(BOTH, '2026-11-29')).toBe(-1);
        expect(dateToDayIndex(WEEK1, '2026-11-22')).toBe(-1);
        expect(dateToDayIndex(WEEK1, 'garbage')).toBe(-1);
    });

    it('slotStartIso는 KST(+09:00) 시각', () => {
        expect(slotStartIso('2026-11-15', { dayIndex: 11, hourIndex: 11 })).toBe('2026-11-26T20:00:00+09:00');
        expect(slotStartIso('2026-11-15', { dayIndex: 0, hourIndex: 0 })).toBe('2026-11-15T09:00:00+09:00');
    });
});

const week = (startDate: string, endDate: string, status: WeekStatus): Week => ({
    id: 1,
    startDate,
    endDate,
    year: 2026,
    weekNumber: 47,
    status,
    displayName: '',
});

const weeks = (mainStatus: WeekStatus, nextStatus: WeekStatus): MainWeeksResponse => ({
    main: week('2026-11-15T00:00:00+09:00', '2026-11-21T23:59:59.999+09:00', mainStatus),
    next: week('2026-11-22T00:00:00+09:00', '2026-11-28T23:59:59.999+09:00', nextStatus),
});

describe('주차 판단', () => {
    const w = weeks(WeekStatus.OPEN, WeekStatus.UPCOMING);

    it('weekSlotOf: 양 끝 날짜 포함, 밖이면 null', () => {
        expect(weekSlotOf('2026-11-15', w)).toBe('main');
        expect(weekSlotOf('2026-11-21', w)).toBe('main');
        expect(weekSlotOf('2026-11-22', w)).toBe('next');
        expect(weekSlotOf('2026-11-28', w)).toBe('next');
        expect(weekSlotOf('2026-11-14', w)).toBeNull();
        expect(weekSlotOf('2026-11-29', w)).toBeNull();
    });

    it('reservationKindOf: main+OPEN → instant, next+UPCOMING → pre', () => {
        expect(reservationKindOf('2026-11-19', w)).toBe('instant');
        expect(reservationKindOf('2026-11-25', w)).toBe('pre');
    });

    it('주차 상태가 맞지 않거나 주차 밖이면 none', () => {
        const rotating = weeks(WeekStatus.CLOSED, WeekStatus.OPEN);
        expect(reservationKindOf('2026-11-19', rotating)).toBe('none');
        expect(reservationKindOf('2026-11-25', rotating)).toBe('none');
        expect(reservationKindOf('2026-11-08', w)).toBe('none');
    });
});
