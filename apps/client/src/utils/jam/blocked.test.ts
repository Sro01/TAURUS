import { describe, it, expect } from 'vitest';
import dayjs from '../dayjs';
import { buildBlocked, buildPendingCounts } from './blocked';
import { ReservationStatus, ReservationType, type Reservation } from '../../types/reservation';

// 기간 2026-11-15(일) ~ 11-21(토). 시안과 같은 "오늘 = 11/19(목) 14시"
const RANGE = { startDate: '2026-11-15', endDate: '2026-11-21' };
const kst = (s: string) => dayjs.tz(s, 'Asia/Seoul');
const NOW = kst('2026-11-19 14:00');
const THU = 4; // 11/19

const reservation = (startTime: string, status: ReservationStatus): Reservation => ({
    id: startTime + status,
    startTime,
    endTime: startTime,
    status,
    type: ReservationType.INSTANT,
    teamId: null,
    teamName: null,
    weekId: 1,
    createdAt: startTime,
    description: null,
});

describe('buildBlocked: 지난 칸', () => {
    it('격자 크기는 기간 일수 x 14', () => {
        const grid = buildBlocked(RANGE, [], NOW);
        expect(grid).toHaveLength(7);
        expect(grid.every((row) => row.length === 14)).toBe(true);
    });

    it('지금 시각이 든 칸(14시)부터 지남, 15시는 열림', () => {
        const grid = buildBlocked(RANGE, [], NOW);
        expect(grid[THU][4]).toBe('past'); // 13시
        expect(grid[THU][5]).toBe('past'); // 14시 (칸 시작 == now)
        expect(grid[THU][6]).toBeNull(); // 15시
    });

    it('14:30이어도 14시 칸은 지남', () => {
        const grid = buildBlocked(RANGE, [], kst('2026-11-19 14:30'));
        expect(grid[THU][5]).toBe('past');
        expect(grid[THU][6]).toBeNull();
    });

    it('지난 날은 전부 지남, 다음 날은 전부 열림', () => {
        const grid = buildBlocked(RANGE, [], NOW);
        expect(grid[THU - 1].every((b) => b === 'past')).toBe(true);
        expect(grid[THU + 1].every((b) => b === null)).toBe(true);
    });

    it('09시 이전이면 그날은 열림, 22시 지나면 그날 전부 지남', () => {
        expect(buildBlocked(RANGE, [], kst('2026-11-19 08:59'))[THU].every((b) => b === null)).toBe(true);
        expect(buildBlocked(RANGE, [], kst('2026-11-19 22:00'))[THU].every((b) => b === 'past')).toBe(true);
    });

    it('now가 다른 시간대(UTC) 표현이어도 KST로 읽는다', () => {
        // 2026-11-19 14:00 KST == 05:00 UTC
        const grid = buildBlocked(RANGE, [], dayjs.utc('2026-11-19T05:00:00Z'));
        expect(grid[THU][5]).toBe('past');
        expect(grid[THU][6]).toBeNull();
    });

    it('KST 자정 직후(UTC로는 전날)에도 날짜가 맞다', () => {
        // 2026-11-19 00:30 KST == 11-18 15:30 UTC
        const grid = buildBlocked(RANGE, [], dayjs.utc('2026-11-18T15:30:00Z'));
        expect(grid[THU - 1].every((b) => b === 'past')).toBe(true);
        expect(grid[THU].every((b) => b === null)).toBe(true);
    });
});

describe('buildBlocked: 마감 상태 종류', () => {
    const at = '2026-11-20T20:00:00+09:00'; // 금(5) 20시 = 인덱스 11
    const blockedFor = (status: ReservationStatus) =>
        buildBlocked(RANGE, [reservation(at, status)], NOW)[5][11];

    it('CONFIRMED, CONFIRMED_ADMIN은 booked', () => {
        expect(blockedFor(ReservationStatus.CONFIRMED)).toBe('booked');
        expect(blockedFor(ReservationStatus.CONFIRMED_ADMIN)).toBe('booked');
    });

    it('PENDING, VOID, CANCELLED는 막지 않음', () => {
        expect(blockedFor(ReservationStatus.PENDING)).toBeNull();
        expect(blockedFor(ReservationStatus.VOID)).toBeNull();
        expect(blockedFor(ReservationStatus.CANCELLED)).toBeNull();
    });

    it('지난 칸이면서 마감이면 past', () => {
        const grid = buildBlocked(RANGE, [reservation('2026-11-19T13:00:00+09:00', ReservationStatus.CONFIRMED)], NOW);
        expect(grid[THU][4]).toBe('past');
    });

    it('UTC 표기 시각도 KST 칸으로 계산, 기간·시간 밖 예약은 무시', () => {
        const utc = '2026-11-20T11:00:00Z'; // 20:00 KST
        const grid = buildBlocked(
            RANGE,
            [
                reservation(utc, ReservationStatus.CONFIRMED),
                reservation('2026-11-22T10:00:00+09:00', ReservationStatus.CONFIRMED),
                reservation('2026-11-20T23:00:00+09:00', ReservationStatus.CONFIRMED),
            ],
            NOW,
        );
        expect(grid[5][11]).toBe('booked');
        expect(grid.flat().filter((b) => b === 'booked')).toHaveLength(1);
    });
});

describe('buildPendingCounts', () => {
    it('PENDING만 칸마다 센다', () => {
        const at = '2026-11-20T20:00:00+09:00';
        const grid = buildPendingCounts(RANGE, [
            reservation(at, ReservationStatus.PENDING),
            reservation(at, ReservationStatus.PENDING),
            reservation(at, ReservationStatus.CONFIRMED),
            reservation('2026-11-21T09:00:00+09:00', ReservationStatus.PENDING),
            reservation('2026-11-30T09:00:00+09:00', ReservationStatus.PENDING),
        ]);
        expect(grid).toHaveLength(7);
        expect(grid[5][11]).toBe(2);
        expect(grid[6][0]).toBe(1);
        expect(grid.flat().reduce((a, b) => a + b, 0)).toBe(3);
    });
});
