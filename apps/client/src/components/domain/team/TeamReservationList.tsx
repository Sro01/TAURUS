import { EmptyState, SectionHeader, ListRow, Badge } from '../../common';
import { Reservation, ReservationStatus } from '../../../types/reservation';
import dayjs from '../../../utils/dayjs';

interface TeamReservationListProps {
  reservations: Reservation[];
  loading: boolean;
  onCancel: (id: string) => void;
  title?: string;
  description?: string;
  showHeader?: boolean;
}

const STATUS_BADGE_VARIANT: Record<ReservationStatus, 'brand' | 'success' | 'danger' | 'warn'> = {
  CONFIRMED: 'success',
  CONFIRMED_ADMIN: 'success',
  PENDING: 'warn',
  CANCELLED: 'danger',
  VOID: 'danger',
};

const STATUS_LABEL: Record<ReservationStatus, string> = {
  CONFIRMED: '예약 확정',
  CONFIRMED_ADMIN: '관리자 예약',
  PENDING: '승인 대기',
  CANCELLED: '취소됨',
  VOID: '무효화됨',
};

export default function TeamReservationList({ 
  reservations, 
  loading, 
  title = "예약 내역",
  description,
  showHeader = true
}: TeamReservationListProps) {
  // 예약 내역 정렬 (최신순)
  const sortedReservations = [...reservations].sort((a, b) => 
    dayjs(b.startTime).valueOf() - dayjs(a.startTime).valueOf()
  );

  return (
    <div className="space-y-4">
      {showHeader && (
        <SectionHeader 
          title={title} 
          description={description || `총 ${reservations.length}건의 예약이 있습니다.`}
        />
      )}

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="text-center text-text-sub py-12 animate-pulse">예약 정보를 불러오는 중...</div>
        ) : sortedReservations.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <EmptyState message="예약 내역이 없습니다." />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sortedReservations.map((res) => {
              const startTime = dayjs(res.startTime);
              const endTime = dayjs(res.endTime);
              const isPast = startTime.isBefore(dayjs());
              const isCancelled = res.status === 'CANCELLED';

              return (
                <ListRow
                  key={res.id}
                  className={`transition-colors ${isCancelled ? 'opacity-50' : ''}`}
                  left={
                    <div className="flex flex-col items-center justify-center w-12 h-12 bg-white/5 rounded-lg border border-white/5 shrink-0">
                      <span className="text-[10px] uppercase text-text-sub leading-none mb-1">{startTime.format('MMM')}</span>
                      <span className="text-sm font-bold text-text-main leading-none">{startTime.format('DD')}</span>
                    </div>
                  }
                  center={
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-text-main font-mono">
                          {startTime.format('HH:mm')} ~ {endTime.format('HH:mm')}
                        </span>
                        <Badge variant={STATUS_BADGE_VARIANT[res.status] || 'default'}>
                          {STATUS_LABEL[res.status] || res.status}
                        </Badge>
                      </div>
                       <div className="flex items-center gap-1.5 text-[11px] text-text-sub">
                          <span className="font-medium">{startTime.format('YYYY.MM.DD (ddd)')}</span>
                          <span className="w-0.5 h-0.5 rounded-full bg-text-muted" />
                          <span>{isPast ? '지난 예약' :  `${startTime.fromNow()} 예정`}</span>
                       </div>
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
