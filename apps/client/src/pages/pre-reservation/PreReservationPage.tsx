import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from '../../utils/dayjs';
import { useAuth, useWeek, useReservation } from '../../hooks';
import { authService } from '../../services';
import { PageContainer, Button, EmptyState } from '../../components/common';
import WeekSelector from '../../components/domain/reservation/WeekSelector';
import TimeSlotList from '../../components/domain/reservation/TimeSlotList';
import AuthModal from '../../components/domain/auth/AuthModal';

export default function PreReservationPage() {
  const navigate = useNavigate();
  const { loginTeam } = useAuth();
  
  // 훅
  const { nextWeek } = useWeek();
  const { 
    reservations, 
    getReservations, 
    createPreReservation 
  } = useReservation();

  // 상태
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 다음 주차 예약 정보 로드
  useEffect(() => {
    if (nextWeek && nextWeek.weekNumber !== undefined) {
      getReservations(nextWeek.weekNumber.toString());
      // 기본 날짜 선택 (월요일)
      setSelectedDate(dayjs(nextWeek.startDate).format('YYYY-MM-DD'));
    } else if (nextWeek) {
      console.error('Next week is missing weekNumber:', nextWeek);
    }
  }, [nextWeek, getReservations]);

  // 날짜 변경 핸들러
  const handleDateSelect = (date: dayjs.Dayjs) => {
    setSelectedDate(date.format('YYYY-MM-DD'));
    setSelectedSlotId(null); // 날짜 변경 시 슬롯 선택 초기화
  };

  // 슬롯 선택 핸들러
  const handleSlotSelect = (timeStr: string) => {
    // "09:00" -> 9
    const hour = parseInt(timeStr.split(':')[0], 10);
    setSelectedSlotId(hour);
    setIsAuthModalOpen(true);
  };

  // 예약 신청 (인증 후 호출됨)
  const handleReservationSubmit = async (name: string, password: string) => {
    console.log('handleReservationSubmit called', { name });
    if (!nextWeek || !selectedDate || selectedSlotId === null) return;

    try {
      setIsSubmitting(true);
      
      // 1. 인증 및 토큰 발급 (자동 가입 옵션 true)
      const { access_token } = await authService.verify({ name, password, autoRegister: true });
      loginTeam(access_token);

      // 2. 예약 생성
      // 밀리초까지 0으로      // 2. 예약 생성
      // 선택된 날짜(selectedDate) 기준으로 시/분/초 설정
      const startTime = dayjs(selectedDate).hour(selectedSlotId).minute(0).second(0).millisecond(0);
      
      console.log('Sending Pre-Reservation Request:', { 
        selectedDate,
        selectedSlotId,
        calculatedStartTime: startTime.format() 
      });
      
      await createPreReservation({
        startTime: startTime.toISOString(),
      });

      alert('예약 신청이 완료되었습니다. (승인 대기)');
      setIsAuthModalOpen(false);
      setSelectedSlotId(null);
      getReservations(nextWeek.weekNumber.toString()); // 목록 갱신

    } catch (error: any) {
      console.error('Reservation Error:', error);
      console.log('Error Response:', error.response?.data);
      alert(error.response?.data?.message || '예약 신청에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!nextWeek) {
    return (
      <PageContainer title="미리 예약">
        <EmptyState 
           message="다음 주차(예약 가능 기간) 정보를 불러올 수 없습니다." 
           action={<Button onClick={() => navigate('/')}>홈으로</Button>}
        />
      </PageContainer>
    );
  }

  // 선택된 날짜의 예약 목록 필터링
  const dailyReservations = reservations.filter(res => 
    dayjs(res.startTime).format('YYYY-MM-DD') === selectedDate
  );

  return (
    <PageContainer title="미리 예약">
      <div className="mb-4 bg-primary/10 p-3 rounded-lg text-sm text-primary">
          <span className="font-bold">Next Week:</span> {nextWeek.weekNumber}주차 
          ({dayjs(nextWeek.startDate).format('MM.DD')} ~ {dayjs(nextWeek.endDate).format('MM.DD')})
      </div>

      <WeekSelector 
        currentWeek={nextWeek}
        selectedDate={dayjs(selectedDate)}
        onSelectDate={handleDateSelect}
      />

      <TimeSlotList 
        reservations={dailyReservations}
        onReserve={handleSlotSelect} // TimeSlotList prop name is onReserve
        selectedDate={dayjs(selectedDate)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSubmit={handleReservationSubmit}
        title="팀 인증 및 예약 신청"
        isSubmitting={isSubmitting}
      />
    </PageContainer>
  );
}
