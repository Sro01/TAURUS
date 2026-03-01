import dayjs from '../../../utils/dayjs';
import { Modal, InlineAlert, Badge } from '../../common';
import { Reservation } from '../../../types/reservation';
import { Clock, Calendar } from 'lucide-react';
import AuthForm from '../auth/AuthForm';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTime: string;
  selectedDate: dayjs.Dayjs | string;
  existingReservations?: Reservation[]; // 대기열 확인용
  onSubmit: (name: string, password: string) => Promise<void>;
  isSubmitting?: boolean;
  teamName?: string | null;
  teamPassword?: string | null;
}

export default function ReservationModal({
  isOpen,
  onClose,
  selectedTime,
  selectedDate,
  existingReservations = [],
  onSubmit,
  isSubmitting = false,
  teamName = '',
  teamPassword = '',
  showWaitlist = true,
}: ReservationModalProps & { showWaitlist?: boolean }) {
  // 해당 시간대의 기존 예약 확인 (대기열)
  const pendingTeams = existingReservations
    .filter(r => {
        const rTime = dayjs(r.startTime).format('HH:mm');
        return rTime === selectedTime && r.status === 'PENDING';
    })
    .map(r => r.teamName || 'Unknown');

  const formattedDate = dayjs(selectedDate).format('M월 D일 (ddd)');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="예약 신청"
    >
      <div className="space-y-6">
        {/* 선택된 시간 정보 */}
        <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
          <div className="flex items-center gap-2 text-text-sub">
            <Calendar className="w-4 h-4" />
            <span className="text-white font-medium">{formattedDate}</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2 text-text-sub">
            <Clock className="w-4 h-4" />
            <span className="text-white font-bold text-lg">{selectedTime}</span>
          </div>
        </div>

        {/* 대기열 정보 (있을 경우만) */}
        {showWaitlist && pendingTeams.length > 0 && (
          <InlineAlert variant="info" title={`현재 대기 ${pendingTeams.length}팀`}>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {pendingTeams.map((team, idx) => (
                <Badge key={idx} variant="info">
                  {team}
                </Badge>
              ))}
            </div>
          </InlineAlert>
        )}

        {/* 인증 및 예약 폼 (AuthForm 재사용) */}
        <AuthForm
          initialName={teamName || ''}
          initialPassword={teamPassword || ''}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          submitLabel="예약하기"
          onCancel={onClose}
        />
      </div>
    </Modal>
  );
}

