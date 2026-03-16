import { Clock, CheckCircle2, ClockFading, CirclePlus, BadgeCheck, Info } from 'lucide-react';

interface TimeSlotProps {
  timeStr: string;
  endTimeStr: string;
  isPast: boolean;
  isPending: boolean;
  isConfirmed: boolean;
  isAdminConfirmed: boolean;
  teamName?: string;
  description?: string | null;
  pendingCount?: number;
  onClick: () => void;
  isLast?: boolean;
}

export default function TimeSlot(props: TimeSlotProps) {
  const {
    timeStr,
    endTimeStr,
    isPending,
    isPast,
    isConfirmed,
    isAdminConfirmed,
    teamName,
    description,
    pendingCount,
    onClick,
    isLast = false,
  } = props;

  // 상태 결정 (우선순위: past > adminConfirmed > confirmed > pending > available)
  const state = isPast
  ? isConfirmed ? 'pastConfirmed' : 'pastEmpty'
  : isAdminConfirmed ? 'adminConfirmed'
    : isConfirmed ? 'confirmed'
    : isPending ? 'pending'
    : 'available';

  const isDisabled = isPast || state === 'confirmed' || state === 'adminConfirmed';

  // 컨텐츠
  const content = 
    state === 'pending' ? `예약 대기 ${pendingCount}팀` :
    teamName || '';

  const subContent = description || (state === 'confirmed' ? '예약 확정' : '');

  // 스타일 맵
  const styles = {
    pastConfirmed: {
        card: 'bg-neutral-950/30 border-white/5 opacity-60',
        dot: 'border-neutral-800 bg-neutral-900',
        time: 'text-neutral-300',
        content: 'text-sm text-neutral-500',
        icon: CheckCircle2,
        iconColor: 'text-neutral-700',
    },
    pastEmpty: {
        card: 'bg-neutral-950/30 border-white/5 opacity-60',
        dot: 'border-neutral-800 bg-neutral-900',
        time: 'text-neutral-300',
        content: 'text-sm text-neutral-600',
        icon: ClockFading,
        iconColor: 'text-neutral-700',
    },
    confirmed: {
        card: 'bg-gradient-to-br from-emerald-900/10 to-emerald-950/10 border-emerald-900/50',
        dot: 'border-emerald-600 bg-emerald-950 shadow-[0_0_8px_rgba(220,38,38,0.6)]',
        time: 'text-emerald-400',
        content: 'font-bold text-md text-white',
        shadow: 'shadow-lg shadow-black/40',
        icon: CheckCircle2,
        iconColor: 'text-emerald-500',
    },
    adminConfirmed: {
        card: 'bg-gradient-to-br from-red-900/10 to-red-950/10 border-red-900/50',
        dot: 'border-red-600 bg-red-950 shadow-[0_0_8px_rgba(220,38,38,0.6)]',
        time: 'text-red-400',
        content: 'font-bold text-md text-white',
        shadow: 'shadow-lg shadow-black/40',
        icon: BadgeCheck,
        iconColor: 'text-red-500',
    },
    pending: {
        card: 'bg-gradient-to-br from-yellow-900/10 to-yellow-950/10 border-yellow-500/20',
        dot: 'border-yellow-500 bg-yellow-950 shadow-[0_0_8px_rgba(234,179,8,0.4)]',
        time: 'text-yellow-400',
        content: 'font-bold text-md text-white',
        icon: Clock,
        iconColor: 'text-yellow-500',
    },
    available: {
        card: 'bg-neutral-900/40 border-neutral-800',
        dot: 'border-neutral-700 bg-neutral-950',
        time: 'text-neutral-300',
        icon: CirclePlus,
        iconColor: 'text-neutral-400',
    },
  }[state];

  const Icon = styles.icon;

  return (
    <div className="relative pl-6 pb-2 group">
      {/* 연결선 */}
      {!isLast && (
        <div className={`absolute left-[19px] top-5 bottom-[-8px] w-[2px] transition-colors duration-300 bg-neutral-800`} />
      )}

      {/* 점 */}
      <div className={`absolute left-[12px] top-5 w-4 h-4 rounded-full border-2 ${styles.dot} z-10 transition-all duration-300 group-hover:scale-110`} />

      {/* 카드 */}
      <div
        onClick={isDisabled ? undefined : onClick}
        className={`ml-6 rounded-2xl border p-4 transition-all duration-300 ${styles.card} ${styles.shadow || ''} ${
          !isDisabled ? 'active:scale-[0.98] active:bg-white/5 cursor-pointer' : 'cursor-not-allowed'
        }`}
      >
        {/* 시간 */}
        <div className="flex justify-between items-center">
          <div className={`text-md font-bold ${styles.time}`}>
            {timeStr} <span className="text-[12px] opacity-70">~ {endTimeStr}</span>
          </div>
          {Icon && <Icon className={`w-4 h-4 ${styles.iconColor}`} />}
        </div>

        {/* 내용 */}
        {content && (
          <div className="my-1">
            <span className={`truncate block ${styles.content}`}>{content}</span>
          </div>
        )}

        {/* 부가정보 */}
          {subContent &&     
            <div className="flex items-center space-x-1">
              <Info className="w-3 h-3 text-neutral-400" />
              <div className="text-sm text-neutral-400">{subContent}</div>
            </div>
          }
      </div>
    </div>
  );
}
