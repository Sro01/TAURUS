import dayjs from 'dayjs';
import { Reservation, ReservationStatus } from '../../../types/reservation';
import TimeSlot from './TimeSlot';

interface TimeSlotListProps {
  selectedDate: dayjs.Dayjs;
  reservations: Reservation[];
  onReserve: (time: string) => void;
}

const SLOT_DURATION_MINUTES = 50;

export default function TimeSlotList({ selectedDate, reservations, onReserve }: TimeSlotListProps) {
  // 09:00 ~ 22:00 슬롯 생성
  const slots = Array.from({ length: 14 }, (_, i) => {
    const hour = i + 9;
    return hour;
  });

  return (
    <div className="flex flex-col">
      {slots.map((hour, i) => {
        // 슬롯 시간 계산
        const slotStart = selectedDate.hour(hour).minute(0).second(0).millisecond(0);
        const slotEnd = slotStart.add(SLOT_DURATION_MINUTES, 'minute');
        const timeStr = slotStart.format('HH:mm');
        const endTimeStr = slotEnd.format('HH:mm');
        
        // 해당 슬롯의 예약들 찾기
        const slotReservations = reservations.filter((r) => {
          const resDate = dayjs(r.startTime);
          return resDate.format('YYYY-MM-DD') === selectedDate.format('YYYY-MM-DD') && 
                 resDate.format('HH:mm') === timeStr;
        });

        const confirmedRes = slotReservations.find(r => 
          r.status === ReservationStatus.CONFIRMED || 
          r.status === ReservationStatus.CONFIRMED_ADMIN
        );
        const pendingResList = slotReservations.filter(r => r.status === ReservationStatus.PENDING);
        const isPending = !confirmedRes && pendingResList.length > 0;

        // 상태 판별
        const isPast = slotStart.isBefore(dayjs());
        const isConfirmed = !!confirmedRes;
        const isAdminConfirmed = !!confirmedRes && confirmedRes.status === ReservationStatus.CONFIRMED_ADMIN;

        const handleSlotClick = () => {
          if (isPast) return;
          if (isConfirmed) return;

          onReserve(timeStr);
        };

        return (
          <TimeSlot
            key={hour}
            timeStr={timeStr}
            endTimeStr={endTimeStr}
            isPast={isPast}
            isConfirmed={isConfirmed}
            isAdminConfirmed={isAdminConfirmed}
            isPending={isPending}
            teamName={confirmedRes?.teamName || undefined}
            description={confirmedRes?.description}
            pendingCount={pendingResList.length}
            onClick={handleSlotClick}
            isLast={i === slots.length - 1}
          />
        );
      })}
    </div>
  );
}
