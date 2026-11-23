import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { jamRoomPath } from '@/constants/routes';
import { jamService } from '@/services/jam.service';
import { getJamErrorMessage } from '@/services/jamApi';
import { JAM_MAX_HEADCOUNT, JAM_MAX_TITLE, type JamRange } from '@/types/jam';
import type { MainWeeksResponse } from '@/types/week';
import { monthDay } from '@/components/domain/jam/JamRoomFormat';
import { kstDate } from '@/utils/jam/slots';

const MIN_HEADCOUNT = 1;

// 서버 주차 시각(+09:00)을 KST 날짜로 바꿔 표시 (브라우저 시간대와 무관)
const fmt = (iso: string) => monthDay(kstDate(iso));

// 방 만들기 (스펙 5.1, 시안 1)
export default function JamCreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [headcount, setHeadcount] = useState(4);
  const [unknownCount, setUnknownCount] = useState(false);
  const [range, setRange] = useState<JamRange>('both');
  const [weeks, setWeeks] = useState<MainWeeksResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    jamService
      .getMainWeeks()
      .then((w) => alive && setWeeks(w))
      .catch(() => undefined); // 날짜 표시만 비고, 만들기는 된다
    return () => {
      alive = false;
    };
  }, []);

  const trimmedTitle = title.trim();
  const canSubmit = trimmedTitle.length > 0 && !submitting;

  const rangeOptions: { value: JamRange; label: string; dates: string }[] = [
    { value: 'this', label: '이번 주', dates: weeks ? `${fmt(weeks.main.startDate)} ~ ${fmt(weeks.main.endDate)}` : '' },
    { value: 'next', label: '다음 주', dates: weeks ? `${fmt(weeks.next.startDate)} ~ ${fmt(weeks.next.endDate)}` : '' },
    { value: 'both', label: '이번 주 + 다음 주', dates: weeks ? `${fmt(weeks.main.startDate)} ~ ${fmt(weeks.next.endDate)}` : '' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const { slug } = await jamService.createRoom({
        title: trimmedTitle,
        headcount: unknownCount ? null : headcount,
        range,
      });
      // 방 화면으로 가서 그 위에 링크 공유 시트를 연다 (JamRoomPage가 state를 읽고 비운다)
      navigate(jamRoomPath(slug), { state: { justCreated: true } });
    } catch (err) {
      setError(getJamErrorMessage(err, '방을 만들지 못했어요. 다시 눌러 주세요'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold">합주 시간 조율</h1>
        <p className="text-[15px] text-muted-foreground">링크를 보내면 다 같이 되는 시간을 칠할 수 있어요.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="jam-title">제목</Label>
        <Input
          id="jam-title"
          value={title}
          maxLength={JAM_MAX_TITLE}
          placeholder="예: 신곡 첫 합주"
          autoComplete="off"
          className="h-12"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label id="jam-headcount-label">몇 명이 함께하나요?</Label>
        <div
          role="group"
          aria-labelledby="jam-headcount-label"
          className="grid h-[52px] grid-cols-[56px_1fr_56px] items-center rounded-xl border border-border bg-card"
        >
          <Button
            type="button"
            variant="ghost"
            aria-label="한 명 줄이기"
            className="h-full rounded-xl"
            disabled={unknownCount || headcount <= MIN_HEADCOUNT}
            onClick={() => setHeadcount((n) => Math.max(MIN_HEADCOUNT, n - 1))}
          >
            <Minus className="size-5" aria-hidden="true" />
          </Button>
          <span
            aria-live="polite"
            className={cn('text-center text-base font-bold', unknownCount && 'font-normal text-[#6b6b73]')}
          >
            {unknownCount ? '정해지지 않음' : `${headcount}명`}
          </span>
          <Button
            type="button"
            variant="ghost"
            aria-label="한 명 늘리기"
            className="h-full rounded-xl"
            disabled={unknownCount || headcount >= JAM_MAX_HEADCOUNT}
            onClick={() => setHeadcount((n) => Math.min(JAM_MAX_HEADCOUNT, n + 1))}
          >
            <Plus className="size-5" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="jam-unknown-count"
            checked={unknownCount}
            onCheckedChange={(v) => setUnknownCount(v === true)}
          />
          <Label htmlFor="jam-unknown-count" className="text-sm font-normal">
            아직 몰라요
          </Label>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label id="jam-range-label">기간</Label>
        <RadioGroup
          aria-labelledby="jam-range-label"
          value={range}
          onValueChange={(v) => setRange(v as JamRange)}
          className="gap-2"
        >
          {rangeOptions.map((o) => (
            <Label
              key={o.value}
              htmlFor={`jam-range-${o.value}`}
              className={cn(
                'flex h-[52px] cursor-pointer items-center gap-3 rounded-xl border px-4 font-normal',
                range === o.value ? 'border-primary bg-primary/12' : 'border-border bg-card',
              )}
            >
              <RadioGroupItem id={`jam-range-${o.value}`} value={o.value} />
              <span className="flex-1 text-[15px] font-bold">{o.label}</span>
              <span className="text-[13px] text-muted-foreground">{o.dates}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {error && (
        <p role="alert" className="text-[13px] text-red-400">
          {error}
        </p>
      )}

      <Button type="submit" disabled={!canSubmit} className="h-13 rounded-xl text-base font-bold">
        만들기
      </Button>
    </form>
  );
}
