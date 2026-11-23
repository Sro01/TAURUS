import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import type { JamParticipant } from '@/types/jam';

interface JamRoomFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: JamParticipant[];
  /** 지금 적용된 꼭 와야 하는 사람 (참여자 id) */
  value: string[];
  onApply: (ids: string[]) => void;
}

const chipClass = (on: boolean) =>
  cn(
    'h-9 rounded-full border px-3.5 text-sm font-bold',
    on
      ? 'border-primary bg-primary text-white hover:bg-primary'
      : 'border-input bg-card text-zinc-200 hover:bg-card',
  );

/** 꼭 와야 하는 사람 고르기. 적용하기를 누를 때까지 카드는 그대로다 */
export default function JamRoomFilterSheet({ open, onOpenChange, participants, value, onApply }: JamRoomFilterSheetProps) {
  const [draft, setDraft] = useState<string[]>(value);
  // 열 때마다 지금 적용값을 초안으로 복사
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(value);
  }

  const toggle = (id: string) =>
    setDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-md gap-4 rounded-t-[22px] border-0 bg-card px-5 pb-6 pt-3">
        <DrawerHeader className="gap-1.5 p-0 text-left">
          <DrawerTitle className="text-lg font-extrabold">꼭 와야 하는 사람</DrawerTitle>
          <DrawerDescription className="text-sm text-muted-foreground">
            고른 사람이 모두 되는 시간만 보여요.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            aria-pressed={draft.length === 0}
            className={chipClass(draft.length === 0)}
            onClick={() => setDraft([])}
          >
            전체 참여자
          </Button>
          {participants.map((person) => {
            const on = draft.includes(person.id);
            return (
              <Button
                key={person.id}
                type="button"
                variant="ghost"
                aria-pressed={on}
                className={chipClass(on)}
                onClick={() => toggle(person.id)}
              >
                {person.name}
              </Button>
            );
          })}
        </div>
        <div className="grid grid-cols-[96px_1fr] gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            className="h-[52px] text-[15px] font-bold text-zinc-300"
            onClick={() => setDraft([])}
          >
            초기화
          </Button>
          <Button
            type="button"
            className="h-[52px] rounded-xl text-base font-bold"
            onClick={() => {
              onApply(draft);
              onOpenChange(false);
            }}
          >
            적용하기
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
