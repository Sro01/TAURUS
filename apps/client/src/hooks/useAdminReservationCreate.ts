import { useRef, useState } from 'react';
import { adminService } from '../services';
import { getJamErrorMessage } from '../services/jamApi';
import type { AdminReservationPreview, CreateAdminReservationsResult } from '../types/admin';
import { buildAdminStartTimes, hoursOf, nextRange, type TimeRange } from '../utils/adminSlots';

/**
 * 관리자 예약 만들기: 날짜 여러 개 × 시간 줄 여러 개 → 미리 보기 확인 → 한 번에 예약.
 * 확인 창을 열면 서버에 미리 물어 이미 관리자 예약이 있는 칸(건너뜀)과
 * 팀 예약이 있는 칸(취소됨)을 보여 준다.
 */
export function useAdminReservationCreate(onCreated?: () => void) {
  const [dates, setDates] = useState<string[]>([]);
  const [ranges, setRanges] = useState<TimeRange[]>(() => [nextRange([])]);
  const [description, setDescription] = useState('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [preview, setPreview] = useState<AdminReservationPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateAdminReservationsResult | null>(null);
  /** 마지막으로 연 확인 창 번호 (닫았다 다시 열면 늦게 온 미리 보기를 버린다) */
  const previewRequest = useRef(0);

  const hours = hoursOf(ranges);
  const slotCount = dates.length * hours.length;
  const trimmedDescription = description.trim();

  /** 예약 버튼을 못 누르는 이유 (누를 수 있으면 null) */
  const blocker =
    dates.length === 0 ? '날짜를 골라 주세요'
    : hours.length === 0 ? '시간을 추가해 주세요'
    : !trimmedDescription ? '점유 사유를 적어 주세요'
    : null;

  const startTimes = () => buildAdminStartTimes(dates, hours);

  const openConfirm = async () => {
    if (blocker) return;
    const request = ++previewRequest.current;
    setError(null);
    setPreview(null);
    setPreviewError(null);
    setConfirmOpen(true);
    try {
      const res = await adminService.previewReservations({ startTimes: startTimes() });
      if (request === previewRequest.current) setPreview(res);
    } catch (e) {
      if (request === previewRequest.current) {
        setPreviewError(getJamErrorMessage(e, '겹치는 예약을 확인하지 못했어요. 닫고 다시 눌러 주세요'));
      }
    }
  };

  const closeConfirm = () => {
    if (submitting) return;
    previewRequest.current++;
    setConfirmOpen(false);
  };

  const canSubmit = !blocker && !submitting && preview !== null && preview.newSlotCount > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await adminService.createReservations({
        startTimes: startTimes(),
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
    openConfirm,
    closeConfirm,
    preview,
    previewError,
    canSubmit,
    submit,
    submitting,
    error,
    result,
    closeResult: () => setResult(null),
  };
}
