import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { JamParticipant } from '@/types/jam';

interface PeopleChipsProps {
  participants: JamParticipant[];
  /** null = 아직 몰라요 */
  headcount: number | null;
  /** 내 참여자 id (칩에 "(나)" 표시) */
  myId: string | null;
  /** 이름을 눌러 그 사람 시간만 보고 있는 참여자 id */
  selectedId: string | null;
  onSelect: (participantId: string | null) => void;
}

/** 참여 현황 카드 + 이름 칩 (누르면 그 사람 시간만) */
export default function PeopleChips({ participants, headcount, myId, selectedId, onSelect }: PeopleChipsProps) {
  const joined = participants.length;
  const emptyCount = headcount ? Math.max(0, headcount - joined) : 0;
  const progress = headcount ? Math.min(100, Math.round((joined / headcount) * 100)) : joined > 0 ? 100 : 0;
  const selected = participants.find((p) => p.id === selectedId) ?? null;

  const hint =
    joined === 0
      ? '링크를 보내면 여기에 이름이 생겨요'
      : selected
        ? `${selected.name} 님 시간만 보고 있어요 · 다시 누르면 모두 보여요`
        : '이름을 누르면 그 사람 시간만 보여요';

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-extrabold">참여 현황</h2>
        <span className="text-sm text-muted-foreground">
          <b className="text-foreground">{joined}</b>
          {headcount ? ` / ${headcount}명` : '명 참여'}
        </span>
      </div>
      <Progress value={progress} aria-label="참여 현황" className="h-2 bg-secondary" />
      <div className="flex flex-wrap gap-1.5">
        <ToggleGroup
          type="single"
          value={selectedId ?? ''}
          onValueChange={(next) => onSelect(next || null)}
          aria-label="참여자"
          spacing={1.5}
          className="w-auto flex-wrap"
        >
          {participants.map((person) => (
            <ToggleGroupItem
              key={person.id}
              value={person.id}
              className="h-9 rounded-full border border-input bg-secondary px-3.5 text-sm font-bold text-zinc-200 hover:bg-secondary data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-white"
            >
              {person.id === myId ? `${person.name} (나)` : person.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {Array.from({ length: emptyCount }, (_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="inline-flex h-9 min-w-11 items-center justify-center rounded-full border border-dashed border-input text-sm text-[#6b6b73]"
          >
            ?
          </span>
        ))}
      </div>
      <span className="text-xs text-[#8b8b93]">{hint}</span>
    </section>
  );
}
