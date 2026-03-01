import { EmptyState, SectionHeader, ListRow, Badge, Checkbox } from '../../common';
import { BulkSelectBar } from '../../common';
import { BulkActionBar } from '../../common';
import { Reservation, ReservationStatus } from '../../../types/reservation';
import dayjs from '../../../utils/dayjs';
import { Info, CalendarBlank, Clock, Users } from '@phosphor-icons/react';

interface ReservationListProps {
  reservations: Reservation[];
  loading: boolean;
  onCancel: (id: string) => Promise<void> | void;

  // 일괄 선택 & 취소
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;

  // 표시 제어
  showTeamName?: boolean;
  title?: string;
  description?: string;
  showHeader?: boolean;
}

/** 예약 상태 → Badge 색상 매핑 */
const STATUS_BADGE_VARIANT: Record<ReservationStatus, 'brand' | 'success' | 'danger' | 'warn'> = {
  CONFIRMED: 'success',
  CONFIRMED_ADMIN: 'success',
  PENDING: 'warn',
  CANCELLED: 'danger',
  VOID: 'danger',
};

/** 예약 상태 → 한글 라벨 매핑 */
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
  onCancel,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  showTeamName = false,
  title = '예약 내역',
  description,
  showHeader = true,
}: ReservationListProps) {
  // 예약 내역 정렬 (최신순)
  const sortedReservations = [...reservations].sort(
    (a, b) => dayjs(b.startTime).valueOf() - dayjs(a.startTime).valueOf()
  );

  // -- 선택 핸들러 --
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    onSelectionChange(checked ? reservations.map((r) => r.id) : []);
  };

  const toggleSelection = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  // -- 일괄 취소 핸들러 --
  const handleBulkCancel = async () => {
    if (!confirm(`선택한 ${selectedIds.length}개의 예약을 취소하시겠습니까?`)) return;
    try {
      await Promise.all(selectedIds.map((id) => onCancel(id)));
      onSelectionChange?.([]);
      alert('예약이 취소되었습니다.');
    } catch (error: any) {
      console.error('일괄 취소 중 오류 발생:', error);
      const statusCode = error.response?.status || 500;
      alert(`예약 취소에 실패했습니다. (status: ${statusCode})`);
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

      {/* 전체 선택 바 — BulkSelectBar 재사용 */}
      {selectable && reservations.length > 0 && (
        <BulkSelectBar
          totalCount={reservations.length}
          selectedCount={selectedIds.length}
          onSelectAll={handleSelectAll}
        />
      )}

      {/* 예약 리스트 본체 */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="text-center text-text-sub py-12 animate-pulse">
            예약 정보를 불러오는 중...
          </div>
        ) : sortedReservations.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <EmptyState message="예약 내역이 없습니다." />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sortedReservations.map((res) => {
              const start = dayjs(res.startTime);
              const end = dayjs(res.endTime);
              const isCancelled = res.status === 'CANCELLED';
              const isSelected = selectedIds.includes(res.id);

              return (
                <ListRow
                  key={res.id}
                  align="start"
                  onClick={selectable ? () => toggleSelection(res.id) : undefined}
                  className={`transition-colors ${isCancelled ? 'opacity-50' : ''} ${
                    isSelected ? 'bg-brand-red/5 border-brand-red/30' : ''
                  }`}
                  left={
                    selectable ? (
                      <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleSelection(res.id)}
                        />
                      </div>
                    ) : undefined
                  }
                  center={
                    <div className="min-w-0 space-y-1.5 mt-0.5">
                      {/* 1행: 날짜 */}
                      <div className="flex items-center gap-1.5 text-xs text-text-sub">
                        <CalendarBlank size={14} className="shrink-0" />
                        <span>{start.format('YY.MM.DD(ddd)')}</span>
                      </div>
                      
                      {/* 2행: 시간 */}
                      <div className="flex items-center gap-1.5 text-sm font-bold text-text-main font-mono whitespace-nowrap">
                        <Clock size={15} className="shrink-0 text-text-muted" />
                        <span>{start.format('HH:mm')} ~ {end.format('HH:mm')}</span>
                      </div>

                      {/* 3행: 팀명 (showTeamName이 true일 때만 표기) */}
                      {showTeamName && (
                        <div className="flex items-center gap-1.5 text-sm font-bold text-text-main min-w-0">
                          <Users size={15} className="shrink-0 text-text-muted" />
                          <span className="truncate">
                            {res.teamName || (res.type === 'ADMIN' ? '관리자 점유' : 'Unknown Team')}
                          </span>
                        </div>
                      )}

                      {/* 3행: 설명 (nullable) */}
                      {res.description && (
                        <div className="flex items-center gap-1.5 text-xs text-text-sub min-w-0">
                          <Info size={14} className="shrink-0" />
                          <span className="truncate">{res.description}</span>
                        </div>
                      )}
                    </div>
                  }
                  right={
                    <Badge
                      className="w-[64px] justify-center mt-0.5 shrink-0"
                      variant={
                        res.type === 'ADMIN'
                          ? 'brand'
                          : STATUS_BADGE_VARIANT[res.status] || 'default'
                      }
                    >
                      {res.type === 'ADMIN'
                        ? 'ADMIN'
                        : STATUS_LABEL[res.status] || res.status}
                    </Badge>
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      {/* 하단 Floating 일괄 취소 바 */}
      {selectable && (
        <BulkActionBar
          selectedCount={selectedIds.length}
          onClear={() => onSelectionChange?.([])}
          onDelete={selectedIds.length > 0 ? handleBulkCancel : undefined}
          deleteLabel="예약 취소"
        />
      )}
    </div>
  );
}
