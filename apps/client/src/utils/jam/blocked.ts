/**
 * 막힌 칸·대기 팀 (스펙 5.3) — 예약 현황 → 격자.
 * 예약 현황은 reservationService.getReservations('current' | 'next')의 confirmed + pending을 합쳐 넘긴다.
 * 예약 시각은 dayjs.tz(..., 'Asia/Seoul')로 KST 날짜·시각을 읽는다.
 * 본문은 utils/jam 담당이 채운다 (지금은 시그니처만).
 */
import type { Dayjs } from 'dayjs';
import type { CellBlock, JamDateRange, SlotGrid } from '../../types/jam';
import type { Reservation } from '../../types/reservation';

const notImplemented = (): never => {
    throw new Error('not implemented');
};

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
    void range; void reservations; void now;
    return notImplemented();
}

/** [dayIndex][hourIndex] 미리 예약 대기(status PENDING) 팀 수 격자 */
export function buildPendingCounts(range: JamDateRange, reservations: Reservation[]): SlotGrid<number> {
    void range; void reservations;
    return notImplemented();
}
