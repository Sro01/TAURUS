import { useState } from 'react';
import { adminService } from '../services';
import { getJamErrorMessage } from '../services/jamApi';
import type { CreateAdminReservationsResult } from '../types/admin';
import { buildAdminStartTimes, hoursOf, nextRange, type TimeRange } from '../utils/adminSlots';

/**
 * 관리자 예약 만들기: 날짜 여러 개 × 시간 줄 여러 개 → 한 번에 예약.
 * 이미 관리자 예약이 있는 칸은 서버가 건너뛰고 result.skipped로 알려 준다.
 */
export function useAdminReservationCreate(onCreated?: () => void) {
  const [dates, setDates] = useState<string[]>([]);
  const [ranges, setRanges] = useState<TimeRange[]>(() => [nextRange([])]);
  const [description, setDescription] = useState('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateAdminReservationsResult | null>(null);

  const hours = hoursOf(ranges);
  const slotCount = dates.length * hours.length;
  const trimmedDescription = description.trim();

  /** 예약 버튼을 못 누르는 이유 (누를 수 있으면 null) */
  const blocker =
    dates.length === 0 ? '날짜를 골라 주세요'
    : hours.length === 0 ? '시간을 추가해 주세요'
    : !trimmedDescription ? '점유 사유를 적어 주세요'
    : null;

  const openConfirm = () => {
    if (blocker) return;
    setError(null);
    setConfirmOpen(true);
  };

  const submit = async () => {
    if (blocker || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await adminService.createReservations({
        startTimes: buildAdminStartTimes(dates, hours),
        description: trimmedDescription,
      });
      setConfirmOpen(false);
      setResult(res);
      setDates([]);
      setDescription('');
      onCreated?.();
    } catch (e) {
      setError(getJamErrorMessage(e, '예약하지 못했어요. 다시 눌러 주세요'));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    dates,
    setDates,
    ranges,
    setRanges,
    description,
    setDescription,
    hours,
    slotCount,
    blocker,
    confirmOpen,
    setConfirmOpen,
    openConfirm,
    submit,
    submitting,
    error,
    result,
    closeResult: () => setResult(null),
  };
}
