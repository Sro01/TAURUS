import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { CellBlock, HeatLevel, JamParticipant, SlotGrid, SlotRef } from '@/types/jam';
import { countGrid, heatLevel } from '@/utils/jam/heatmap';
import { SLOT_COUNT, dayDate, indexToHour, isSlotOn, weekDayIndexes } from '@/utils/jam/slots';
import { dayOfMonth, dowLabel, padHour } from './JamRoomFormat';

interface AvailabilityGridProps {
  startDate: string;
  participants: JamParticipant[];
  /** 방 안 몇 번째 주를 그리는지 (0부터) */
  weekIndex: number;
  /** [dayIndex][hourIndex] 지난 칸·마감 칸 */
  blocked: SlotGrid<CellBlock>;
  /** [dayIndex][hourIndex] 미리 예약 대기 팀 수 */
  pending: SlotGrid<number>;
  /** 이름 칩으로 고른 사람 (있으면 그 사람 시간만 칠해서 보여 준다) */
  focusId: string | null;
  selected: SlotRef | null;
  /** 오늘 (KST) 'YYYY-MM-DD' */
  today: string;
  onSelect: (ref: SlotRef) => void;
}

const HEAT_CLASS: Record<HeatLevel, string> = {
  0: 'bg-[#1c1c20] text-[#ecfdf5]',
  1: 'bg-[#123124] text-[#ecfdf5]',
  2: 'bg-[#14573c] text-[#ecfdf5]',
  3: 'bg-[#0f8a58] text-white',
  4: 'bg-[#34d399] text-[#022c1c]',
};

const HEAT_SWATCH = ['bg-[#1c1c20]', 'bg-[#123124]', 'bg-[#14573c]', 'bg-[#0f8a58]', 'bg-[#34d399]'];

const BOOKED_STRIPES = 'repeating-linear-gradient(135deg,#2e2e33 0 3px,#151517 3px 7px)';
const LEGEND_STRIPES = 'repeating-linear-gradient(135deg,#3a3a40 0 2px,#151517 2px 5px)';

/** 모두의 시간: 칸마다 되는 사람 수를 색으로. 칸을 누르면 누가 되는지 보여 준다 */
export default function AvailabilityGrid({
  startDate,
  participants,
  weekIndex,
  blocked,
  pending,
  focusId,
  selected,
  today,
  onSelect,
}: AvailabilityGridProps) {
  const total = participants.length;
  const counts = useMemo(() => countGrid(participants, blocked.length), [participants, blocked.length]);
  const focus = participants.find((p) => p.id === focusId) ?? null;

  const dayIndexes = weekDayIndexes(blocked.length, weekIndex);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          0
          <span className="flex gap-0.5" aria-hidden="true">
            {HEAT_SWATCH.map((color) => (
              <span key={color} className={cn('size-3 rounded-[3px]', color)} />
            ))}
          </span>
          {total}명
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[#facc15]" aria-hidden="true" />
          미리 예약 대기
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-[3px]" style={{ backgroundImage: LEGEND_STRIPES }} aria-hidden="true" />
          예약 마감
        </span>
      </div>

      <div className="grid grid-cols-[30px_repeat(7,minmax(0,1fr))] gap-[3px]">
        <span />
        {dayIndexes.map((dayIndex) => {
          const date = dayDate(startDate, dayIndex);
          const dow = dowLabel(date);
          return (
            <span
              key={dayIndex}
              className={cn(
                'flex flex-col items-center gap-px rounded-lg py-1',
                dow === '일' ? 'text-[#f87171]' : dow === '토' ? 'text-[#60a5fa]' : 'text-muted-foreground',
                date === today && 'bg-secondary',
              )}
            >
              <span className="text-[11px] font-medium">{dow}</span>
              <span className="text-[13px] font-bold">{dayOfMonth(date)}</span>
            </span>
          );
        })}
      </div>

      <div className="flex flex-col gap-[3px]">
        {Array.from({ length: SLOT_COUNT }, (_, hourIndex) => (
          <div key={hourIndex} className="grid grid-cols-[30px_repeat(7,minmax(0,1fr))] gap-[3px]">
            <span className="flex items-center text-[11px] tabular-nums text-[#8b8b93]">
              {padHour(indexToHour(hourIndex))}
            </span>
            {dayIndexes.map((dayIndex) => {
              const block = blocked[dayIndex]?.[hourIndex] ?? null;
              const count = counts[dayIndex]?.[hourIndex] ?? 0;
              const waiting = pending[dayIndex]?.[hourIndex] ?? 0;
              const isSelected = selected?.dayIndex === dayIndex && selected.hourIndex === hourIndex;
              const date = dayDate(startDate, dayIndex);
              const focusOn = focus ? isSlotOn(focus.slots[dayIndex] ?? 0, hourIndex) : false;
              const label = !focus && count > 0 ? String(count) : '';
              const aria =
                `${dowLabel(date)} ${dayOfMonth(date)}일 ${indexToHour(hourIndex)}시, ${count}/${total}명` +
                (block === 'past' ? ', 지남' : block === 'booked' ? ', 예약 마감' : '');

              return (
                <button
                  key={dayIndex}
                  type="button"
                  aria-label={aria}
                  disabled={block !== null}
                  onClick={() => onSelect({ dayIndex, hourIndex })}
                  style={block === 'booked' ? { backgroundImage: BOOKED_STRIPES } : undefined}
                  className={cn(
                    'relative h-6 rounded-[5px] p-0 text-[11px] font-extrabold tabular-nums focus-visible:outline-2 focus-visible:outline-foreground',
                    block === 'past'
                      ? 'bg-[#111113]'
                      : block === 'booked'
                        ? 'bg-transparent'
                        : focus
                          ? focusOn
                            ? 'bg-primary text-white'
                            : 'bg-[#1c1c20]'
                          : HEAT_CLASS[heatLevel(count, total)],
                    isSelected && 'outline-2 outline-foreground',
                  )}
                >
                  {block === null && label}
                  {block === null && waiting > 0 && (
                    <span
                      className="absolute right-[3px] top-[3px] size-1.5 rounded-full bg-[#facc15]"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
