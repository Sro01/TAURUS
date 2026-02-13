import { Card, EmptyState } from '../../common';
import { Reservation } from '../../../types/reservation';
import dayjs from '../../../utils/dayjs';
import { Trash2 } from 'lucide-react';

interface TeamReservationListProps {
  reservations: Reservation[];
  loading: boolean;
  onCancel: (id: string) => void;
}

export default function TeamReservationList({ reservations, loading, onCancel }: TeamReservationListProps) {
  // 예약 내역 정렬 (최신순)
  const sortedReservations = [...reservations].sort((a, b) => 
    dayjs(b.startTime).valueOf() - dayjs(a.startTime).valueOf()
  );

  return (
    <>
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        팀 예약 현황
        <span className="text-xs font-normal text-text-sub bg-white/10 px-2 py-0.5 rounded-full">
          {reservations.length}
        </span>
      </h3>

      <div className="space-y-3 mb-12">
        {loading ? (
          <div className="text-center text-text-sub py-4">불러오는 중...</div>
        ) : sortedReservations.length === 0 ? (
          <EmptyState message="예약 내역이 없습니다." />
        ) : (
          sortedReservations.map((res) => {
            const startTime = dayjs(res.startTime);
            const isPast = startTime.isBefore(dayjs());
            const isCancelled = res.status === 'CANCELLED';

            return (
              <Card key={res.id} className={`p-4 flex items-center justify-between ${isCancelled ? 'opacity-50' : ''}`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-bold ${isPast ? 'text-text-sub' : 'text-text-main'}`}>
                      {startTime.format('M월 D일 (ddd)')}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      res.status === 'CONFIRMED' ? 'bg-success/20 text-success' :
                      res.status === 'PENDING' ? 'bg-primary/20 text-primary' :
                      'bg-white/10 text-text-sub'
                    }`}>
                      {res.status === 'CONFIRMED' ? '예약 확정' : 
                       res.status === 'PENDING' ? '승인 대기' : '취소됨'}
                    </span>
                  </div>
                  <div className="text-xl font-mono font-medium">
                    {startTime.format('HH:00')} ~ {dayjs(res.endTime).format('HH:50')}
                  </div>
                </div>

                {!isPast && !isCancelled && (
                  <button 
                    onClick={() => onCancel(res.id)}
                    className="p-2 text-text-sub hover:text-error hover:bg-error/10 rounded-full transition-colors"
                    title="예약 취소"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </Card>
            );
          })
        )}
      </div>
    </>
  );
}
