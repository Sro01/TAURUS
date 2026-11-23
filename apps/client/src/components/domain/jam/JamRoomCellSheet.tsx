import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { JamParticipant, ReservationKind } from '@/types/jam';

interface JamRoomCellSheetProps {
  /** '11월 22일 (일) 19:00' */
  when: string;
  available: JamParticipant[];
  unavailable: JamParticipant[];
  /** 미리 예약 대기 팀 수 */
  waiting: number;
  /** 예약 버튼 종류. 'none'이면 버튼을 보여 주지 않는다 */
  kind: ReservationKind;
  onBook: () => void;
  onClose: () => void;
}

/** 모두의 시간에서 칸을 눌렀을 때 아래에 뜨는 칸 상세 (누가 되는지 + 예약 버튼) */
export default function JamRoomCellSheet({
  when,
  available,
  unavailable,
  waiting,
  kind,
  onBook,
  onClose,
}: JamRoomCellSheetProps) {
  const total = available.length + unavailable.length;

  return (
    <section
      aria-label="고른 칸"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-[576px] flex-col gap-2.5 rounded-[18px] border border-input bg-[#1c1c20] p-4 shadow-[0_-12px_32px_rgba(0,0,0,0.6)]"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-extrabold">{when}</h3>
        <div className="flex items-center gap-1">
          <span className="text-base font-extrabold text-[#34d399]">
            {available.length}/{total}명
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="닫기"
            className="size-10 text-muted-foreground"
            onClick={onClose}
          >
            <X className="size-[18px]" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-1 text-sm leading-[1.45]">
        <span className="text-zinc-200">
          {available.length > 0 ? `됨 · ${available.map((p) => p.name).join(', ')}` : '아직 되는 사람이 없어요'}
        </span>
        {unavailable.length > 0 && (
          <span className="text-[#8b8b93]">안 됨 · {unavailable.map((p) => p.name).join(', ')}</span>
        )}
        {waiting > 0 && <span className="text-[#facc15]">미리 예약 대기 {waiting}팀</span>}
      </div>
      {kind !== 'none' && (
        <Button type="button" className="h-12 rounded-xl text-base font-bold" onClick={onBook}>
          {kind === 'pre' ? '미리 예약하기' : '바로 예약하기'}
        </Button>
      )}
    </section>
  );
}
