import { describe, expect, it } from 'vitest';
import { buildAdminStartTimes, hoursOf, nextRange, rangeLabel } from './adminSlots';

describe('hoursOf', () => {
  it('범위들을 합쳐 겹치지 않는 시작 시각으로 정렬한다', () => {
    expect(hoursOf([{ startHour: 14, endHour: 16 }, { startHour: 10, endHour: 10 }, { startHour: 15, endHour: 17 }]))
      .toEqual([10, 14, 15, 16, 17]);
  });

  it('범위가 없으면 빈 배열', () => {
    expect(hoursOf([])).toEqual([]);
  });
});

describe('buildAdminStartTimes', () => {
  it('날짜 × 시간 조합을 KST 시작 시각으로 만든다', () => {
    expect(buildAdminStartTimes(['2026-11-27', '2026-11-25'], [14, 15])).toEqual([
      '2026-11-25T14:00:00+09:00',
      '2026-11-25T15:00:00+09:00',
      '2026-11-27T14:00:00+09:00',
      '2026-11-27T15:00:00+09:00',
    ]);
  });
});

describe('nextRange', () => {
  it('처음이면 09:00 한 칸', () => {
    expect(nextRange([])).toEqual({ startHour: 9, endHour: 9 });
  });

  it('마지막 범위 다음 시각 한 칸', () => {
    expect(nextRange([{ startHour: 14, endHour: 16 }])).toEqual({ startHour: 17, endHour: 17 });
  });

  it('마지막 범위가 22시에서 끝나면 비어 있는 가장 이른 시각', () => {
    expect(nextRange([{ startHour: 9, endHour: 10 }, { startHour: 20, endHour: 22 }])).toEqual({ startHour: 11, endHour: 11 });
  });
});

describe('rangeLabel', () => {
  it('NN:00 ~ MM:50', () => {
    expect(rangeLabel({ startHour: 9, endHour: 11 })).toBe('09:00 ~ 11:50');
  });
});
