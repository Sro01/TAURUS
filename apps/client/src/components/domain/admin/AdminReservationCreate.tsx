import { CircleAlert, TriangleAlert, X } from 'lucide-react';
import dayjs from '@/utils/dayjs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useAdminReservationCreate } from '@/hooks/useAdminReservationCreate';
import { rangeLabel } from '@/utils/adminSlots';
import { MultiDatePicker } from '../../common';
import AdminTimeRanges from './AdminTimeRanges';
import AdminReservationResultDialog from './AdminReservationResultDialog';

const dateLabel = (date: string) => dayjs(date).format('M/D (ddd)');

interface AdminReservationCreateProps {
  /** 예약을 만든 뒤 (목록 다시 받기) */
  onCreated?: () => void;
}

/** 관리자 권한으로 예약하기: 날짜 여러 개 × 시간 줄 여러 개 → 확인 → 결과 */
export default function AdminReservationCreate({ onCreated }: AdminReservationCreateProps) {
  const form = useAdminReservationCreate(onCreated);
  const { dates, ranges, hours, slotCount, blocker } = form;

  const submitLabel = blocker ?? `${dates.length}일 × ${hours.length}시간 · ${slotCount}칸 예약하기`;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>관리자 권한으로 예약하기</CardTitle>
          <CardDescription>고른 시간이 바로 확정되고, 그 시간의 팀 예약은 취소돼요.</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
            <FieldSet>
              <FieldLegend variant="label">날짜</FieldLegend>
              <MultiDatePicker selectedDates={dates} onChange={form.setDates} />
              {dates.length > 0 && (
                <ul aria-label="고른 날짜" className="flex flex-wrap gap-2">
                  {dates.map((date) => (
                    <li key={date}>
                      <Badge variant="secondary" className="h-8 gap-1 pr-1 pl-3 text-sm">
                        {dateLabel(date)}
                        <button
                          type="button"
                          aria-label={`${dateLabel(date)} 빼기`}
                          onClick={() => form.setDates(dates.filter((d) => d !== date))}
                          className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-background/60 hover:text-foreground [&>svg]:size-3.5"
                        >
                          <X />
                        </button>
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </FieldSet>

            <FieldGroup>
              <FieldSet>
                <FieldLegend variant="label">시간</FieldLegend>
                <AdminTimeRanges ranges={ranges} onChange={form.setRanges} />
              </FieldSet>

              <Field>
                <FieldLabel htmlFor="admin-reservation-description">점유 사유</FieldLabel>
                <Input
                  id="admin-reservation-description"
                  value={form.description}
                  onChange={(e) => form.setDescription(e.target.value)}
                  placeholder="예: 베이스 레슨"
                />
              </Field>
            </FieldGroup>
          </div>
        </CardContent>

        <CardFooter>
          <Button size="lg" className="w-full" disabled={blocker !== null} onClick={form.openConfirm}>
            {submitLabel}
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={form.confirmOpen} onOpenChange={(open) => !form.submitting && form.setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{slotCount}칸을 관리자 예약으로 잡을까요?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-left">
                <dt>날짜</dt>
                <dd className="text-foreground">{dates.map(dateLabel).join(' · ')}</dd>
                <dt>시간</dt>
                <dd className="text-foreground">{ranges.map(rangeLabel).join(', ')} ({hours.length}시간)</dd>
                <dt>사유</dt>
                <dd className="text-foreground">{form.description.trim()}</dd>
              </dl>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Alert>
            <TriangleAlert />
            <AlertDescription>이 시간에 잡힌 팀 예약은 취소돼요</AlertDescription>
          </Alert>

          {form.error && (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{form.error}</AlertDescription>
            </Alert>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={form.submitting}>닫기</AlertDialogCancel>
            <AlertDialogAction
              disabled={form.submitting}
              onClick={(e) => {
                // 결과가 올 때까지 창을 열어 둔다
                e.preventDefault();
                form.submit();
              }}
            >
              {form.submitting ? '예약하는 중…' : `${slotCount}칸 예약하기`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdminReservationResultDialog result={form.result} onClose={form.closeResult} />
    </>
  );
}
