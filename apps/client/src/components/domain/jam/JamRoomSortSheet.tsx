import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import type { SortKey } from '@/types/jam';
import { SORT_OPTIONS } from './JamRoomFormat';

interface JamRoomSortSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: SortKey;
  /** 고르면 시트가 닫히고 정렬이 바뀐다 */
  onChange: (sort: SortKey) => void;
}

/** 우선순위 정렬 고르기 */
export default function JamRoomSortSheet({ open, onOpenChange, value, onChange }: JamRoomSortSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-md gap-1 rounded-t-[22px] border-0 bg-card px-3 pb-6 pt-3">
        <DrawerHeader className="p-0 px-2 pb-2 text-left">
          <DrawerTitle className="text-lg font-extrabold">정렬</DrawerTitle>
          <DrawerDescription className="sr-only">우선순위 카드를 보여 줄 순서를 골라요</DrawerDescription>
        </DrawerHeader>
        {SORT_OPTIONS.map((option) => {
          const on = option.key === value;
          return (
            <Button
              key={option.key}
              type="button"
              variant="ghost"
              aria-pressed={on}
              className={cn(
                'h-13 justify-between rounded-xl px-3 text-[15px] font-bold',
                on ? 'bg-secondary text-foreground' : 'text-zinc-300',
              )}
              onClick={() => {
                onChange(option.key);
                onOpenChange(false);
              }}
            >
              {option.label}
              {on && <Check className="size-[18px] text-[#f87171]" aria-hidden="true" />}
            </Button>
          );
        })}
      </DrawerContent>
    </Drawer>
  );
}
