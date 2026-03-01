import { X, Trash, CalendarPlus } from '@phosphor-icons/react';

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete?: () => void;
  onCreate?: () => void;
  /** 삭제 버튼 라벨 커스텀 (기본: "삭제") */
  deleteLabel?: string;
}

export default function BulkActionBar({ selectedCount, onClear, onDelete, onCreate, deleteLabel = '삭제' }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-surface-elevated border border-brand-red/30 px-6 py-3 rounded-full shadow-2xl animate-in slide-in-from-bottom-4">
      <span className="text-sm font-bold text-white whitespace-nowrap">
        {selectedCount}개 선택됨
      </span>
      <div className="h-4 w-px bg-white/20" />
      <div className="flex items-center gap-2">
        {onCreate && (
          <button onClick={onCreate} className="flex items-center shrink-0 whitespace-nowrap gap-2 px-3 py-1.5 text-sm font-medium text-bg-main bg-brand-red rounded-md hover:bg-red-600 transition-colors">
            <CalendarPlus weight="bold" /> 생성
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="flex items-center shrink-0 whitespace-nowrap gap-2 px-3 py-1.5 text-sm font-medium text-status-danger hover:bg-status-danger/10 rounded-md transition-colors">
            <Trash weight="bold" /> {deleteLabel}
          </button>
        )}
        <button onClick={onClear} className="shrink-0 flex items-center justify-center p-1.5 text-text-sub hover:text-white transition-colors">
          <X weight="bold" />
        </button>
      </div>
    </div>
  );
}
