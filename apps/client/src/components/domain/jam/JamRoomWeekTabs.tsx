import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface JamRoomWeekTabsProps {
  labels: string[];
  value: number;
  onChange: (weekIndex: number) => void;
}

/** 두 주짜리 방의 주 고르기 탭 (모두의 시간, 내 시간 칠하기 공용) */
export default function JamRoomWeekTabs({ labels, value, onChange }: JamRoomWeekTabsProps) {
  return (
    <Tabs value={String(value)} onValueChange={(next) => onChange(Number(next))}>
      <TabsList aria-label="주차" className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-card p-1">
        {labels.map((label, index) => (
          <TabsTrigger
            key={index}
            value={String(index)}
            className="h-10 rounded-[9px] border-transparent px-1 text-sm font-bold text-[#8b8b93] data-[state=active]:border-transparent data-[state=active]:bg-[#3f3f46] data-[state=active]:text-[#f4f4f5] data-[state=active]:shadow-none"
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
