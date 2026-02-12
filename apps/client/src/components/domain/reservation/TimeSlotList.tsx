import dayjs from '../../../utils/dayjs';
import { Reservation } from '../../../types/index';
import { Button, Card } from '../../common';

interface TimeSlotListProps {
  selectedDate: dayjs.Dayjs;
  reservations: Reservation[];
  onReserve: (time: string) => void;
}

export default function TimeSlotList({ selectedDate, reservations, onReserve }: TimeSlotListProps) {
  // 09:00 ~ 22:00 슬롯 생성
  const slots = Array.from({ length: 14 }, (_, i) => {
    const hour = i + 9; // 9, 10, ... 22
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    return timeStr;
  });

  return (
    <div className="space-y-3 pb-20">
      {slots.map((time) => {
        // 해당 날짜+시간의 예약 찾기
        // 분 단위까지 문자열로 비교하여 정확도 향상
        const slotStart = selectedDate.hour(parseInt(time.split(':')[0])).minute(0).second(0).millisecond(0);
        const slotTimeStr = slotStart.format('YYYY-MM-DD HH:mm');
        
        const reservation = reservations.find((r) => {
          const rTime = dayjs(r.startTime).format('YYYY-MM-DD HH:mm');
          // console.log(`Slot: ${slotTimeStr}, Res: ${rTime}, Match: ${rTime === slotTimeStr}`);
          return rTime === slotTimeStr;
        });

        // 상태 판별
        const isConfirmed = reservation?.status === 'CONFIRMED';
        const isPending = reservation?.status === 'PENDING';
        // 과거 시간인지 확인 (현재 시간 기준 이미 지나거나 진행 중인 슬롯은 마감 처리)
        // 예: 15:43일 때 15:00 슬롯은 마감되어야 함
        const isPast = slotStart.isBefore(dayjs());

        return (
          <Card key={time} className="flex items-center justify-between p-4 bg-bg-card/50">
            <div className="flex items-center gap-4">
              <span className={`text-lg font-mono font-medium ${isPast ? 'text-text-sub/30' : 'text-text-main'}`}>
                {time}
              </span>
              {isConfirmed && (
                <span className="text-sm text-text-sub">
                  {reservation?.team?.name}
                </span>
              )}
              {isPending && (
                <span className="text-sm text-primary">
                  예약 대기 중
                </span>
              )}
            </div>

            <div>
              {isConfirmed ? (
                <span className="px-3 py-1 text-xs font-medium text-text-sub bg-white/5 rounded-full">
                  예약 완료
                </span>
              ) : isPending ? (
                <span className="px-3 py-1 text-xs font-medium text-primary bg-primary/10 rounded-full">
                  대기 중
                </span>
              ) : isPast ? (
                <span className="px-3 py-1 text-xs font-medium text-text-sub/30">
                  마감
                </span>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => onReserve(time)}
                  className="px-6 py-1.5 text-sm h-auto"
                >
                  예약
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
