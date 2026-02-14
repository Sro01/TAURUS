import { EmptyState, SectionHeader, ListRow, Badge, Checkbox, Text } from '../../common';
import { Reservation, ReservationStatus } from '../../../types/reservation';
import dayjs from '../../../utils/dayjs';
import { Info } from '@phosphor-icons/react';

interface ReservationListProps {
  reservations: Reservation[];
  loading: boolean;
  onCancel: (id: string) => void;
  // 선택 기능 관련
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  // 데이터 표시 관련
  showTeamName?: boolean;
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
  CONFIRMED_ADMIN: '관리자 점유',
  PENDING: '승인 대기',
  CANCELLED: '취소됨',
  VOID: '무효화됨',
};

export default function ReservationList({ 
  reservations, 
  loading, 
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  showTeamName = false,
  title = "예약 내역",
  description,
  showHeader = true
}: ReservationListProps) {
  // 예약 내역 정렬 (최신순)
  const sortedReservations = [...reservations].sort((a, b) => 
    dayjs(b.startTime).valueOf() - dayjs(a.startTime).valueOf()
  );

  const isAllSelected = reservations.length > 0 && selectedIds.length === reservations.length;

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange(reservations.map(r => r.id));
    } else {
      onSelectionChange([]);
    }
  };

  const toggleSelection = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-4">
      {showHeader && (
        <SectionHeader 
          title={title} 
          description={description || `총 ${reservations.length}건의 예약이 있습니다.`}
        />
      )}

      {/* 전체 선택 바 */}
      {selectable && reservations.length > 0 && (
        <div className="flex items-center gap-2 px-2 mb-2">
           <Checkbox 
             checked={isAllSelected}
             onChange={(e) => handleSelectAll(e.target.checked)}
             label="전체 선택"
             className="text-xs text-text-sub"
           />
        </div>
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
              const start = dayjs(res.startTime);
              const end = dayjs(res.endTime);
              const isPast = start.isBefore(dayjs());
              const isCancelled = res.status === 'CANCELLED';
              const isSelected = selectedIds.includes(res.id);

              return (
                <ListRow
                  key={res.id}
                  onClick={selectable ? () => toggleSelection(res.id) : undefined}
                  className={`transition-colors ${isCancelled ? 'opacity-50' : ''} ${isSelected ? 'bg-brand-red/5 border-brand-red/30' : ''}`}
                  left={
                    <div className="flex items-center gap-4">
                      {selectable && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox 
                            checked={isSelected}
                            onChange={() => toggleSelection(res.id)}
                          />
                        </div>
                      )}
                      {!selectable && (
                        <div className="flex flex-col items-center justify-center w-12 h-12 bg-white/5 rounded-lg border border-white/5 shrink-0">
                          <span className="text-[10px] uppercase text-text-sub leading-none mb-1">{start.format('MMM')}</span>
                          <span className="text-sm font-bold text-text-main leading-none">{start.format('DD')}</span>
                        </div>
                      )}
                    </div>
                  }
                  center={
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        {showTeamName ? (
                          <Text weight="bold" className="text-base truncate">
                            {res.teamName || (res.type === 'ADMIN' ? '관리자 점유' : 'Unknown Team')}
                          </Text>
                        ) : (
                          <div className="flex items-center gap-2">
                             <span className="text-sm font-bold text-text-main font-mono">
                                {start.format('HH:mm')} ~ {end.format('HH:mm')}
                              </span>
                          </div>
                        )}
                        <Badge variant={res.type === 'ADMIN' ? 'brand' : STATUS_BADGE_VARIANT[res.status] || 'default'}>
                          {res.type === 'ADMIN' ? 'ADMIN' : (STATUS_LABEL[res.status] || res.status)}
                        </Badge>
                      </div>

                      <div className="flex flex-col gap-1">
                        {showTeamName && (
                          <div className="text-xs text-text-sub font-mono">
                            {start.format('M/D(ddd) HH:mm')} ~ {end.format('HH:mm')}
                          </div>
                        )}
                        {!showTeamName && (
                           <div className="flex items-center gap-1.5 text-[11px] text-text-sub">
                              <span className="font-medium">{start.format('YYYY.MM.DD (ddd)')}</span>
                              <span className="w-0.5 h-0.5 rounded-full bg-text-muted" />
                              <span>{isPast ? '지난 예약' :  `${start.fromNow()} 예정`}</span>
                           </div>
                        )}
                        
                        {res.type === 'ADMIN' && res.description && (
                          <div className="flex items-center gap-1 text-[11px] text-text-sub min-w-0">
                            <Info size={12} className="shrink-0" /> 
                            <span className="truncate">{res.description}</span>
                          </div>
                        )}
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
