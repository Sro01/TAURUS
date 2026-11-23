import { TriangleAlert } from 'lucide-react';
import dayjs from '@/utils/dayjs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { CreateAdminReservationsResult } from '@/types/admin';
import { JAM_TIMEZONE } from '@/utils/jam/slots';

interface AdminReservationResultDialogProps {
  /** null이면 닫혀 있다 */
  result: CreateAdminReservationsResult | null;
  onClose: () => void;
}

const slotLabel = (iso: string) => dayjs(iso).tz(JAM_TIMEZONE).format('M/D (ddd) HH:mm');

/** 관리자 예약 결과: 잡은 칸 수 + 이미 관리자 예약이 있어 건너뛴 칸 */
export default function AdminReservationResultDialog({ result, onClose }: AdminReservationResultDialogProps) {
  const created = result?.created.length ?? 0;
  const skipped = result?.skipped ?? [];

  return (
    <AlertDialog open={result !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{created > 0 ? `${created}칸 예약했어요` : '새로 잡은 칸이 없어요'}</AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            {skipped.length > 0 ? `${skipped.length}칸은 건너뛰었어요` : '모든 칸을 예약했어요'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {skipped.length > 0 && (
          <Alert>
            <TriangleAlert />
            <AlertTitle>{skipped.length}칸은 이미 관리자 예약이 있어 건너뛰었어요</AlertTitle>
            <AlertDescription>
              <ul className="flex w-full flex-col gap-1">
                {skipped.map((slot) => (
                  <li key={slot.startTime} className="flex justify-between gap-4">
                    <span className="text-foreground">{slotLabel(slot.startTime)}</span>
                    {slot.description && <span className="truncate">{slot.description}</span>}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogAction>확인</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
