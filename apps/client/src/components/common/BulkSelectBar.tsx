import Checkbox from './Checkbox';
import { Text } from './Text';

interface BulkSelectBarProps {
  totalCount: number;
  selectedCount: number;
  onSelectAll: (checked: boolean) => void;
  className?: string;
}

export function BulkSelectBar({
  totalCount,
  selectedCount,
  onSelectAll,
  className = ""
}: BulkSelectBarProps) {
  const isAllSelected = totalCount > 0 && selectedCount === totalCount;
  const isPartialSelected = selectedCount > 0 && selectedCount < totalCount;

  return (
    <div className={`flex items-center justify-between px-4 py-2 mb-2 ${className}`}>
      <Checkbox
        checked={isAllSelected}
        indeterminate={isPartialSelected}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSelectAll(e.target.checked)}
        label={
          <div className="flex items-center gap-2">
            <Text variant="caption" weight="bold" color={selectedCount > 0 ? 'main' : 'sub'}>
              전체 선택
            </Text>
            {selectedCount > 0 && (
              <span className="text-[10px] bg-brand-red text-white px-1.5 py-0.5 rounded-full ">
                {selectedCount}
              </span>
            )}
          </div>
        }
      />
      <Text variant="caption" color="muted">
        총 {totalCount}건
      </Text>
    </div>
  );
}
