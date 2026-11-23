import dayjs from '../common/utils/dayjs';
import {
  dayCount,
  emptySlots,
  expiredRoomCutoff,
  fromDbDate,
  isEnded,
  jamTokenExpiresAt,
  SLOT_COUNT,
  slotsError,
  toDbDate,
  todayKst,
} from './jam-slots';

const db = (ymd: string) => new Date(`${ymd}T00:00:00Z`);

describe('jam-slots', () => {
  it('하루 14칸', () => {
    expect(SLOT_COUNT).toBe(14);
  });

  it('toDbDate: KST 0시·23:59 문자열 → 그 KST 날짜의 UTC 0시 (전날로 밀리지 않음)', () => {
    expect(toDbDate(dayjs('2026-11-22T00:00:00+09:00')).toISOString()).toBe(
      '2026-11-22T00:00:00.000Z',
    );
    expect(toDbDate(dayjs('2026-11-28T23:59:59+09:00')).toISOString()).toBe(
      '2026-11-28T00:00:00.000Z',
    );
  });

  it('fromDbDate: YYYY-MM-DD', () => {
    expect(fromDbDate(db('2026-11-15'))).toBe('2026-11-15');
  });

  it('todayKst: UTC 16시 = KST 다음 날 1시', () => {
    expect(todayKst(dayjs('2026-11-22T16:00:00Z'))).toBe('2026-11-23');
    expect(todayKst(dayjs('2026-11-22T14:59:59Z'))).toBe('2026-11-22');
  });

  it('dayCount: 7일, 14일', () => {
    expect(dayCount(db('2026-11-22'), db('2026-11-28'))).toBe(7);
    expect(dayCount(db('2026-11-22'), db('2026-12-05'))).toBe(14);
  });

  it('isEnded: 오늘 > 마지막 날일 때만', () => {
    expect(isEnded(db('2026-11-28'), '2026-11-28')).toBe(false);
    expect(isEnded(db('2026-11-28'), '2026-11-29')).toBe(true);
  });

  it('지난 방 기준: 오늘 - 7일', () => {
    expect(fromDbDate(expiredRoomCutoff('2026-11-23'))).toBe('2026-11-16');
    expect(fromDbDate(expiredRoomCutoff('2026-03-01'))).toBe('2026-02-22');
  });

  it('출입증 만료: 마지막 날 + 8일 0시 KST', () => {
    expect(jamTokenExpiresAt(db('2026-11-28'))).toBe(
      dayjs('2026-12-06T00:00:00+09:00').unix(),
    );
  });

  it('slotsError: 길이·값 검사', () => {
    expect(emptySlots(7)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(slotsError([0, 1, 16383, 0, 0, 0, 0], 7)).toBeNull();
    expect(slotsError(emptySlots(6), 7)).not.toBeNull();
    expect(slotsError(emptySlots(14), 7)).not.toBeNull();
    expect(slotsError([16384, 0, 0, 0, 0, 0, 0], 7)).not.toBeNull();
    expect(slotsError([-1, 0, 0, 0, 0, 0, 0], 7)).not.toBeNull();
    expect(slotsError([1.5, 0, 0, 0, 0, 0, 0], 7)).not.toBeNull();
  });
});
