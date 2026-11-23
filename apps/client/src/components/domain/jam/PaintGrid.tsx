import { useCallback, useEffect, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import type { CellBlock, SlotGrid } from '@/types/jam';
import { SLOT_COUNT, dayDate, gridToSlots, indexToHour, slotsToGrid } from '@/utils/jam/slots';
import JamRoomWeekTabs from './JamRoomWeekTabs';
import { DAYS_PER_WEEK, dayOfMonth, dowLabel } from './JamRoomFormat';

type PaintMode = 'can' | 'cant';

interface Cell {
  d: number; // dayIndex (방 기간 안 날짜 번호)
  h: number; // hourIndex
}

interface Drag {
  start: Cell;
  end: Cell;
  /** 시작 칸이 이미 칠해져 있으면 지우기 */
  erase: boolean;
}

interface PaintGridProps {
  /** 이름 입력 단계에서 정한 내 이름 */
  name: string;
  startDate: string;
  /** 지금 저장된 내 가능 칸 */
  initialSlots: number[];
  /** [dayIndex][hourIndex] 지난 칸·마감 칸 (칠할 수 없음) */
  blocked: SlotGrid<CellBlock>;
  weekIndex: number;
  /** 주 탭 글자. 한 주짜리 방이면 탭 대신 rangeText를 보여 준다 */
  weekLabels: string[];
  rangeText: string;
  onWeekChange: (weekIndex: number) => void;
  /** 오늘 (KST) 'YYYY-MM-DD' */
  today: string;
  saving: boolean;
  /** 저장할 slots (날짜마다 14비트) */
  onSave: (slots: number[]) => void;
}

const BOOKED_STRIPES = 'repeating-linear-gradient(135deg,#2e2e33 0 3px,#151517 3px 7px)';

const inDragRange = (drag: Drag, d: number, h: number): boolean =>
  d >= Math.min(drag.start.d, drag.end.d) &&
  d <= Math.max(drag.start.d, drag.end.d) &&
  h >= Math.min(drag.start.h, drag.end.h) &&
  h <= Math.max(drag.start.h, drag.end.h);

/**
 * 내 시간 칠하기: 드래그(터치·마우스)로 네모 칠하기, 요일·시간 한 줄, 되는/안 되는 전환.
 * 되는 모드의 칠한 칸 = 저장할 칸. 안 되는 모드는 열 수 있는 칸 중 칠하지 않은 칸이 저장할 칸.
 */
export default function PaintGrid({
  name,
  startDate,
  initialSlots,
  blocked,
  weekIndex,
  weekLabels,
  rangeText,
  onWeekChange,
  today,
  saving,
  onSave,
}: PaintGridProps) {
  const days = blocked.length;
  const isOpen = useCallback((d: number, h: number) => blocked[d]?.[h] === null, [blocked]);

  // 저장돼 있던 칸 (막힌 칸의 값은 그대로 보내려고 따로 둔다)
  const [base] = useState<SlotGrid<boolean>>(() =>
    slotsToGrid(Array.from({ length: days }, (_, d) => initialSlots[d] ?? 0)),
  );
  const [marks, setMarks] = useState<SlotGrid<boolean>>(() =>
    base.map((row, d) => row.map((on, h) => on && blocked[d]?.[h] === null)),
  );
  const [mode, setMode] = useState<PaintMode>('can');
  const [drag, setDrag] = useState<Drag | null>(null);

  const dayIndexes = Array.from({ length: DAYS_PER_WEEK }, (_, i) => weekIndex * DAYS_PER_WEEK + i).filter(
    (d) => d < days,
  );

  // 놓을 때 한 번에 적용
  useEffect(() => {
    if (!drag) return;
    const commit = () => {
      setMarks((prev) => prev.map((row, d) => row.map((m, h) => (inDragRange(drag, d, h) && isOpen(d, h) ? !drag.erase : m))));
      setDrag(null);
    };
    const cancel = () => setDrag(null);
    window.addEventListener('pointerup', commit);
    window.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('pointerup', commit);
      window.removeEventListener('pointercancel', cancel);
    };
  }, [drag, isOpen]);

  const handleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    // 터치는 처음 누른 칸이 계속 이벤트를 받으므로 손가락 아래 칸을 직접 찾는다
    const el = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-cell]');
    if (!el) return;
    const d = Number(el.dataset.d);
    const h = Number(el.dataset.h);
    setDrag((prev) => (prev && !(prev.end.d === d && prev.end.h === h) ? { ...prev, end: { d, h } } : prev));
  };

  const toggleCells = (cells: Cell[]) => {
    const open = cells.filter((c) => isOpen(c.d, c.h));
    if (open.length === 0) return;
    const allMarked = open.every((c) => marks[c.d][c.h]);
    setMarks((prev) =>
      prev.map((row, d) => row.map((m, h) => (open.some((c) => c.d === d && c.h === h) ? !allMarked : m))),
    );
  };

  const pickDay = (d: number) => toggleCells(Array.from({ length: SLOT_COUNT }, (_, h) => ({ d, h })));
  const pickHour = (h: number) => toggleCells(dayIndexes.map((d) => ({ d, h })));

  const changeMode = (next: PaintMode) => {
    if (next === mode) return;
    setMode(next);
    // 칠한 게 있으면 같은 결과가 되도록 열 수 있는 칸 기준으로 뒤집는다
    if (marks.some((row) => row.some(Boolean))) {
      setMarks((prev) => prev.map((row, d) => row.map((m, h) => (isOpen(d, h) ? !m : false))));
    }
  };

  const savedGrid: SlotGrid<boolean> = base.map((row, d) =>
    row.map((baseOn, h) => (isOpen(d, h) ? (mode === 'can' ? marks[d][h] : !marks[d][h]) : baseOn)),
  );
  const savedCount = savedGrid.reduce(
    (sum, row, d) => sum + row.filter((on, h) => on && isOpen(d, h)).length,
    0,
  );

  return (
    <div className="flex flex-col gap-2.5 pb-28">
      <div className="flex flex-col gap-2">
        <span className="text-lg font-extrabold">
          <span className="text-[#fca5a5]">{name}</span> 님의
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(next) => next && changeMode(next as PaintMode)}
            aria-label="칠하는 방식"
            spacing={0.5}
            className="rounded-[10px] bg-card p-[3px]"
          >
            <ToggleGroupItem
              value="can"
              className="h-8 rounded-lg px-4 text-sm font-bold data-[state=on]:bg-primary data-[state=on]:text-white"
            >
              되는
            </ToggleGroupItem>
            <ToggleGroupItem
              value="cant"
              className="h-8 rounded-lg px-4 text-sm font-bold data-[state=on]:bg-[#52525b] data-[state=on]:text-white"
            >
              안 되는
            </ToggleGroupItem>
          </ToggleGroup>
          <span className="text-lg font-extrabold">시간을 칠해 주세요</span>
        </div>
      </div>

      {weekLabels.length > 1 ? (
        <JamRoomWeekTabs labels={weekLabels} value={weekIndex} onChange={onWeekChange} />
      ) : (
        <span className="text-sm font-bold text-zinc-300">{rangeText}</span>
      )}

      <div className="flex items-center justify-between gap-2 text-xs text-[#8b8b93]">
        <span>끌면 네모로 칠해져요 · 요일·시간을 누르면 한 줄</span>
        <span className="whitespace-nowrap font-bold text-zinc-300">되는 시간 {savedCount}칸</span>
      </div>

      <div className="grid grid-cols-[34px_repeat(7,minmax(0,1fr))] gap-[3px]">
        <span />
        {dayIndexes.map((d) => {
          const date = dayDate(startDate, d);
          const dow = dowLabel(date);
          const anyOpen = Array.from({ length: SLOT_COUNT }, (_, h) => h).some((h) => isOpen(d, h));
          return (
            <button
              key={d}
              type="button"
              disabled={!anyOpen}
              aria-label={`${dow}요일 전체 칠하기`}
              onClick={() => pickDay(d)}
              className={cn(
                'flex flex-col items-center gap-px rounded-lg py-1 outline-none focus-visible:outline-2 focus-visible:outline-foreground disabled:opacity-40',
                dow === '일' ? 'text-[#f87171]' : dow === '토' ? 'text-[#60a5fa]' : 'text-zinc-300',
                date === today && 'bg-secondary',
              )}
            >
              <span className="text-[11px] font-medium">{dow}</span>
              <span className="text-[13px] font-bold">{dayOfMonth(date)}</span>
            </button>
          );
        })}
      </div>

      <div className="flex touch-none select-none flex-col gap-[3px]" onPointerMove={handleMove}>
        {Array.from({ length: SLOT_COUNT }, (_, h) => (
          <div key={h} className="grid grid-cols-[34px_repeat(7,minmax(0,1fr))] gap-[3px]">
            <button
              type="button"
              aria-label={`${indexToHour(h)}시 한 줄 칠하기`}
              onClick={() => pickHour(h)}
              className="h-[30px] p-0 text-left text-[11px] tabular-nums text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-foreground"
            >
              {String(indexToHour(h)).padStart(2, '0')}시
            </button>
            {dayIndexes.map((d) => {
              const block = blocked[d]?.[h] ?? null;
              const previewing = drag !== null && block === null && inDragRange(drag, d, h);
              const marked = previewing ? !drag.erase : marks[d][h];
              const date = dayDate(startDate, d);
              const aria =
                `${dowLabel(date)} ${dayOfMonth(date)}일 ${indexToHour(h)}시` +
                (block === 'past' ? ', 지남' : block === 'booked' ? ', 예약 마감' : '') +
                (block === null && marks[d][h] ? ', 칠함' : '');

              return (
                <button
                  key={d}
                  type="button"
                  data-cell=""
                  data-d={d}
                  data-h={h}
                  aria-label={aria}
                  disabled={block !== null}
                  onPointerDown={(event) => {
                    if (event.button !== 0 || block !== null) return;
                    setDrag({ start: { d, h }, end: { d, h }, erase: marks[d][h] });
                  }}
                  onClick={(event) => {
                    // 키보드(Enter·Space)로 누른 경우만. 마우스·터치는 pointer 이벤트로 이미 처리
                    if (event.detail === 0) toggleCells([{ d, h }]);
                  }}
                  style={block === 'booked' ? { backgroundImage: BOOKED_STRIPES } : undefined}
                  className={cn(
                    'flex h-[30px] items-center justify-center rounded-md p-0 text-xs outline-none focus-visible:outline-2 focus-visible:outline-foreground',
                    block === 'past' && 'bg-[#111113]',
                    block === 'booked' && 'bg-transparent',
                    block === null &&
                      (marked
                        ? mode === 'can'
                          ? 'bg-primary'
                          : 'bg-[#3f3f46] text-muted-foreground'
                        : 'bg-[#1c1c20] shadow-[inset_0_0_0_1px_#2a2a2f]'),
                    previewing && 'shadow-[inset_0_0_0_2px_#ffffff]',
                  )}
                >
                  {block === null && marked && mode === 'cant' ? '×' : ''}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#1f1f23] bg-background">
        <div className="mx-auto grid max-w-[600px] grid-cols-[96px_1fr] gap-2 p-4">
          <Button
            type="button"
            variant="outline"
            className="h-[52px] rounded-xl border-input bg-transparent text-[15px] font-bold text-zinc-300"
            onClick={() => setMarks((prev) => prev.map((row) => row.map(() => false)))}
          >
            초기화
          </Button>
          <Button
            type="button"
            disabled={saving}
            className="h-[52px] rounded-xl text-base font-bold"
            onClick={() => onSave(gridToSlots(savedGrid))}
          >
            등록하기
          </Button>
        </div>
      </div>
    </div>
  );
}
