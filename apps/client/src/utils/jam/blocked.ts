/**
 * 막힌 칸·대기 팀 (스펙 5.3) — 예약 현황 → 격자.
 * 예약 현황은 reservationService.getReservations('current' | 'next')의 confirmed + pending을 합쳐 넘긴다.
 * 예약 시각은 dayjs.tz(..., 'Asia/Seoul')로 KST 날짜·시각을 읽는다.
 */
import type { Dayjs } from 'dayjs';
import dayjs from '../dayjs';
import type { CellBlock, JamDateRange, SlotGrid } from '../../types/jam';
import { ReservationStatus, type Reservation } from '../../types/reservation';
import { JAM_TIMEZONE, SLOT_COUNT, dateToDayIndex, dayCount, dayDate, hourToIndex, indexToHour } from './slots';

const emptyGrid = <T>(range: JamDateRange, fill: T): SlotGrid<T> =>
    Array.from({ length: dayCount(range) }, () => new Array<T>(SLOT_COUNT).fill(fill));

/** 예약 시작 시각을 기간 안 칸 위치로. 기간 밖이거나 09~22시 밖이면 null */
function reservationCell(range: JamDateRange, reservation: Reservation) {
    const start = dayjs(reservation.startTime).tz(JAM_TIMEZONE);
    if (!start.isValid()) return null;
    const dayIndex = dateToDayIndex(range, start.format('YYYY-MM-DD'));
    const hourIndex = hourToIndex(start.hour());
    return dayIndex < 0 || hourIndex < 0 ? null : { dayIndex, hourIndex };
}

/**
 * [dayIndex][hourIndex] 막힌 이유 격자.
 * - 'past': 칸 시작 시각 ≤ now (KST). 지금 시각이 든 칸도 지남 (시안: 14시대에 14시 칸 지남)
 * - 'booked': status가 CONFIRMED 또는 CONFIRMED_ADMIN인 예약이 그 칸에 있음
 * - 둘 다면 'past'. 그 외 null
 */
export function buildBlocked(
    range: JamDateRange,
    reservations: Reservation[],
    now: Dayjs,
): SlotGrid<CellBlock> {
    const grid = emptyGrid<CellBlock>(range, null);

    for (const reservation of reservations) {
        if (
            reservation.status !== ReservationStatus.CONFIRMED &&
            reservation.status !== ReservationStatus.CONFIRMED_ADMIN
        ) {
            continue;
        }
        const cell = reservationCell(range, reservation);
        if (cell) grid[cell.dayIndex][cell.hourIndex] = 'booked';
    }

    // 칸 시작이 now(KST) 이전이면 지남. 날짜 문자열은 사전순 = 날짜순
    const nowKst = now.tz(JAM_TIMEZONE);
    const nowDate = nowKst.format('YYYY-MM-DD');
    const nowHour = nowKst.hour();
    for (let d = 0; d < grid.length; d++) {
        const date = dayDate(range.startDate, d);
        for (let h = 0; h < SLOT_COUNT; h++) {
            if (date < nowDate || (date === nowDate && indexToHour(h) <= nowHour)) grid[d][h] = 'past';
        }
    }
    return grid;
}

/** [dayIndex][hourIndex] 미리 예약 대기(status PENDING) 팀 수 격자 */
export function buildPendingCounts(range: JamDateRange, reservations: Reservation[]): SlotGrid<number> {
    const grid = emptyGrid(range, 0);
    for (const reservation of reservations) {
        if (reservation.status !== ReservationStatus.PENDING) continue;
        const cell = reservationCell(range, reservation);
        if (cell) grid[cell.dayIndex][cell.hourIndex]++;
    }
    return grid;
}
