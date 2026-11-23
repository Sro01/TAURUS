import { CircleAlert, CircleCheck, LoaderCircle, TriangleAlert } from 'lucide-react';
import dayjs from '@/utils/dayjs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { AdminReservationPreview, OverwrittenTeam } from '@/types/admin';
import { JAM_TIMEZONE } from '@/utils/jam/slots';

interface AdminReservationConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  /** 고른 칸 수 (미리 보기가 오기 전 제목에 씀) */
  slotCount: number;
  /** 날짜 · 시간 · 사유 요약 */
  summary: { dates: string; times: string; description: string };
  /** null이면 확인하는 중 */
  preview: AdminReservationPreview | null;
  previewError: string | null;
  canSubmit: boolean;
  submitting: boolean;
  error: string | null;
  onSubmit: () => void;
}

const slotLabel = (iso: string) => dayjs(iso).tz(JAM_TIMEZONE).format('M/D (ddd) HH:mm');
const teamLabel = (team: OverwrittenTeam) =>
  `${team.teamName ?? '알 수 없는 팀'}${team.status === 'PENDING' ? ' (대기)' : ''}`;

/** 관리자 예약 전 확인: 요약 + 겹치는 예약(건너뛸 칸, 팀 예약이 취소될 칸) */
export default function AdminReservationConfirmDialog({
  open,
  onClose,
  slotCount,
  summary,
  preview,
  previewError,
  canSubmit,
  submitting,
  error,
  onSubmit,
}: AdminReservationConfirmDialogProps) {
  const newCount = preview?.newSlotCount ?? slotCount;
  const skipped = preview?.skipped ?? [];
  const overwritten = preview?.overwritten ?? [];

  const submitLabel =
    submitting ? '예약하는 중…'
    : previewError ? `${slotCount}칸 예약하기`
    : !preview ? '확인하는 중…'
    : preview.newSlotCount === 0 ? '새로 잡을 칸이 없어요'
    : `${preview.newSlotCount}칸 예약하기`;

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{newCount}칸을 관리자 예약으로 잡을까요?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 justify-self-start text-left">
              <dt>날짜</dt>
              <dd className="text-foreground">{summary.dates}</dd>
              <dt>시간</dt>
              <dd className="text-foreground">{summary.times}</dd>
              <dt>사유</dt>
              <dd className="text-foreground">{summary.description}</dd>
            </dl>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {previewError ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>{previewError}</AlertDescription>
          </Alert>
        ) : !preview ? (
          <Alert>
            <LoaderCircle className="animate-spin" />
            <AlertDescription>겹치는 예약을 확인하는 중이에요</AlertDescription>
          </Alert>
        ) : skipped.length === 0 && overwritten.length === 0 ? (
          <Alert>
            <CircleCheck />
            <AlertDescription>겹치는 예약이 없어요</AlertDescription>
          </Alert>
        ) : (
          <div className="flex max-h-72 flex-col gap-3 overflow-y-auto">
            {overwritten.length > 0 && (
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertTitle className="line-clamp-none">{overwritten.length}칸의 팀 예약이 취소돼요</AlertTitle>
                <AlertDescription>
                  <ul className="flex w-full flex-col gap-1">
                    {overwritten.map((slot) => (
                      <li key={slot.startTime} className="flex justify-between gap-4">
                        <span className="shrink-0 text-foreground">{slotLabel(slot.startTime)}</span>
                        <span className="truncate">{slot.teams.map(teamLabel).join(', ')}</span>
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {skipped.length > 0 && (
              <Alert>
                <TriangleAlert />
                <AlertTitle className="line-clamp-none">{skipped.length}칸은 이미 관리자 예약이 있어 건너뛰어요</AlertTitle>
                <AlertDescription>
                  <ul className="flex w-full flex-col gap-1">
                    {skipped.map((slot) => (
                      <li key={slot.startTime} className="flex justify-between gap-4">
                        <span className="shrink-0 text-foreground">{slotLabel(slot.startTime)}</span>
                        {slot.description && <span className="truncate">{slot.description}</span>}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>닫기</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canSubmit}
            onClick={(e) => {
              // 결과가 올 때까지 창을 열어 둔다
              e.preventDefault();
              onSubmit();
            }}
          >
            {submitLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
