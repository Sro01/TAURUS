import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { endLabel, nextRange, rangeLabel, startLabel, type TimeRange } from '@/utils/adminSlots';
import { SLOT_HOURS } from '@/utils/jam/slots';

interface AdminTimeRangesProps {
  ranges: TimeRange[];
  onChange: (ranges: TimeRange[]) => void;
}

/** 시간 줄들: [시작 NN:00] ~ [끝 MM:50] [빼기], 아래 "시간 추가" */
export default function AdminTimeRanges({ ranges, onChange }: AdminTimeRangesProps) {
  const update = (index: number, patch: Partial<TimeRange>) => {
    onChange(
      ranges.map((range, i) => {
        if (i !== index) return range;
        const next = { ...range, ...patch };
        // 시작을 끝보다 늦게 고르면 끝도 따라간다
        return next.endHour < next.startHour ? { ...next, endHour: next.startHour } : next;
      }),
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {ranges.map((range, index) => (
        <div key={index} className="flex items-center gap-2">
          <Select value={String(range.startHour)} onValueChange={(v) => update(index, { startHour: Number(v) })}>
            <SelectTrigger aria-label="시작 시간" className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {SLOT_HOURS.map((hour) => (
                  <SelectItem key={hour} value={String(hour)}>
                    {startLabel(hour)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <span className="text-muted-foreground">~</span>

          <Select value={String(range.endHour)} onValueChange={(v) => update(index, { endHour: Number(v) })}>
            <SelectTrigger aria-label="끝 시간" className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {SLOT_HOURS.filter((hour) => hour >= range.startHour).map((hour) => (
                  <SelectItem key={hour} value={String(hour)}>
                    {endLabel(hour)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`${rangeLabel(range)} 빼기`}
            onClick={() => onChange(ranges.filter((_, i) => i !== index))}
          >
            <X />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => onChange([...ranges, nextRange(ranges)])}
      >
        <Plus data-icon="inline-start" />
        시간 추가
      </Button>
    </div>
  );
}
