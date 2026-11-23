import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CellBlock, JamParticipant, JamRoom, PriorityCard, SlotGrid, SlotRef, SortKey } from '@/types/jam';
import type { MainWeeksResponse } from '@/types/week';
import { buildPriorityCards } from '@/utils/jam/ranking';
import { dayDate, indexToHour, reservationKindOf, weekSlotOf } from '@/utils/jam/slots';
import { SORT_OPTIONS, dateLabel, hourLabel } from './JamRoomFormat';
import JamRoomFilterSheet from './JamRoomFilterSheet';
import JamRoomSortSheet from './JamRoomSortSheet';

interface PriorityListProps {
  room: JamRoom;
  /** [dayIndex][hourIndex] 지난 칸·마감 칸 */
  blocked: SlotGrid<CellBlock>;
  /** [dayIndex][hourIndex] 미리 예약 대기 팀 수 */
  pending: SlotGrid<number>;
  weeks: MainWeeksResponse | null;
  /** 내 시간을 등록할 수 있는지 (끝나지 않은 방) */
  canRegister: boolean;
  /** 카드의 추천 칸으로 예약을 시작한다 */
  onBook: (ref: SlotRef) => void;
  onRegister: () => void;
}

const WEEK_TAG: Record<'main' | 'next', string> = { main: '이번 주', next: '다음 주' };

/** 우선순위 카드 + 정렬 + 꼭 와야 하는 사람 (계산은 utils/jam/ranking 결과를 그린다) */
export default function PriorityList({ room, blocked, pending, weeks, canRegister, onBook, onRegister }: PriorityListProps) {
  const { participants } = room;
  const [sort, setSort] = useState<SortKey>('people');
  const [required, setRequired] = useState<string[]>([]);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // 방에서 빠진 사람은 조건에서 뺀다
  const requiredIds = useMemo(
    () => required.filter((id) => participants.some((p) => p.id === id)),
    [required, participants],
  );
  const cards = useMemo(
    () => buildPriorityCards(participants, blocked, pending, requiredIds, sort),
    [participants, blocked, pending, requiredIds, sort],
  );

  const requiredNames = participants.filter((p) => requiredIds.includes(p.id)).map((p) => p.name);
  const filterLabel =
    requiredNames.length === 0
      ? '전체 참여자'
      : requiredNames.length === 1
        ? `${requiredNames[0]} 필수`
        : `${requiredNames[0]} 외 ${requiredNames.length - 1}명 필수`;
  const sortLabel = SORT_OPTIONS.find((o) => o.key === sort)?.label ?? '';

  return (
    <div className="flex flex-col gap-3.5 pb-6">
      <h1 className="text-[22px] font-extrabold leading-[1.35]">
        지금까지 <span className="text-[#f87171]">{participants.length}명</span>이<br />
        시간을 칠했어요
      </h1>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-9 gap-1 rounded-[10px] px-3 text-[13px] font-bold',
            requiredIds.length > 0
              ? 'border-primary bg-primary/15 text-[#fca5a5] hover:bg-primary/20'
              : 'border-input bg-card text-zinc-200',
          )}
          onClick={() => setFilterOpen(true)}
        >
          {filterLabel}
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-9 gap-1 rounded-[10px] border-input bg-card px-3 text-[13px] font-bold text-zinc-200"
          onClick={() => setSortOpen(true)}
        >
          {sortLabel}
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </Button>
      </div>

      {cards.length === 0 && (
        <div className="flex flex-col items-center gap-3.5 rounded-2xl bg-card px-4 py-10">
          <span className="text-[15px] text-muted-foreground">
            {participants.length === 0 ? '아직 아무도 칠하지 않았어요' : '조건에 맞는 시간이 없어요'}
          </span>
          {participants.length === 0 && canRegister && (
            <Button type="button" variant="secondary" className="h-11 px-[18px] font-bold" onClick={onRegister}>
              내 시간 등록
            </Button>
          )}
          {participants.length > 0 && requiredIds.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              className="h-11 px-[18px] font-bold"
              onClick={() => setRequired([])}
            >
              조건 초기화
            </Button>
          )}
        </div>
      )}

      {cards.map((card, index) => (
        <PriorityCardView
          key={`${card.dayIndex}-${card.startHourIndex}`}
          card={card}
          rank={index + 1}
          room={room}
          weeks={weeks}
          onBook={onBook}
        />
      ))}

      <JamRoomSortSheet open={sortOpen} onOpenChange={setSortOpen} value={sort} onChange={setSort} />
      <JamRoomFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        participants={participants}
        value={requiredIds}
        onApply={setRequired}
      />
    </div>
  );
}

interface PriorityCardViewProps {
  card: PriorityCard;
  rank: number;
  room: JamRoom;
  weeks: MainWeeksResponse | null;
  onBook: (ref: SlotRef) => void;
}

function PriorityCardView({ card, rank, room, weeks, onBook }: PriorityCardViewProps) {
  const { participants } = room;
  const date = dayDate(room.startDate, card.dayIndex);
  const startHour = indexToHour(card.startHourIndex);
  const available = participants.filter((p: JamParticipant) => card.participantIds.includes(p.id));
  const unavailable = participants.filter((p: JamParticipant) => !card.participantIds.includes(p.id));

  // 이번 주/다음 주 표시와 예약 종류는 저장하지 않고 볼 때마다 서버 주차 기준으로 붙인다 (지나간 주는 날짜만)
  const weekSlot = weeks ? weekSlotOf(date, weeks) : null;
  const kind = room.ended || !weeks ? 'none' : reservationKindOf(date, weeks);

  const summary = [
    `${participants.length}명 중 ${available.length}명 가능`,
    unavailable.length > 0 ? `${unavailable.length}명 불가능` : null,
    `${card.length}시간`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'flex size-[26px] shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold',
            rank === 1 ? 'bg-primary text-white' : 'bg-secondary text-zinc-300',
          )}
        >
          {rank}
        </span>
        <span className="min-w-0 flex-1 text-base font-extrabold">
          {dateLabel(date)} {hourLabel(startHour)} ~ {hourLabel(startHour + card.length)}
        </span>
        {weekSlot && <span className="whitespace-nowrap text-xs text-muted-foreground">{WEEK_TAG[weekSlot]}</span>}
      </div>
      <span className="text-[13px] text-muted-foreground">{summary}</span>
      <div className="flex flex-wrap gap-1">
        {available.map((p) => (
          <span
            key={p.id}
            aria-label={`${p.name} 가능`}
            className="inline-flex h-[26px] items-center rounded-full border border-transparent bg-[#34d399]/12 px-[9px] text-xs font-bold text-[#a7f3d0]"
          >
            {p.name}
          </span>
        ))}
        {unavailable.map((p) => (
          <span
            key={p.id}
            aria-label={`${p.name} 불가능`}
            className="inline-flex h-[26px] items-center rounded-full border border-border px-[9px] text-xs font-medium text-[#71717a]"
          >
            {p.name}
          </span>
        ))}
      </div>
      {kind !== 'none' && (
        <Button
          type="button"
          variant="outline"
          className="mt-0.5 h-11 rounded-[10px] border-input bg-secondary text-sm font-bold text-foreground"
          onClick={() => onBook({ dayIndex: card.dayIndex, hourIndex: card.recommendedHourIndex })}
        >
          {kind === 'pre' ? '미리 예약하기' : '바로 예약하기'}
        </Button>
      )}
    </article>
  );
}
