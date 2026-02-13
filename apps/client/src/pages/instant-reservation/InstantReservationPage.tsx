import { useState, useEffect } from 'react';
import dayjs from '../../utils/dayjs';
import { useWeek, useReservation, useAuth } from '../../hooks';
import { PageContainer, EmptyState } from '../../components/common';
import WeekSelector from '../../components/domain/reservation/WeekSelector';
import TimeSlotList from '../../components/domain/reservation/TimeSlotList';
import AuthModal from '../../components/domain/auth/AuthModal';
import { authService } from '../../services';

export default function InstantReservationPage() {
  // 상태
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 훅
  const { currentWeek, loading: weekLoading } = useWeek();
  const { reservations, loading: resLoading, getReservations, createInstantReservation } = useReservation();
  const { loginTeam } = useAuth();

  // 주차 정보 로드되면 해당 주차의 예약 정보 가져오기
  useEffect(() => {
    if (currentWeek && currentWeek.weekNumber !== undefined) {
      console.log('Current Week:', currentWeek);
      getReservations(currentWeek.weekNumber.toString()).then(res => {
        // res가 ReservationListResponse (confirmed, pending) 이거나
        // useReservation 훅에서 이미 [] 로 변환했을 수 있음.
        // useReservation을 보면 getReservations는 service.getReservations를 그대로 리턴.
        // Service는 ReservationListResponse를 리턴.
        console.log('Fetched Reservations:', res);
      });
    } else if (currentWeek) {
      console.error('Current week is missing weekNumber:', currentWeek);
    }
  }, [currentWeek, getReservations]);

  // 예약 버튼 클릭 핸들러
  const handleReserveClick = (time: string) => {
    setSelectedTime(time);
    setIsAuthModalOpen(true);
  };

  // 모달 제출 핸들러 (인증 + 예약)
  const handleAuthSubmit = async (name: string, password: string) => {
    if (!selectedTime || !currentWeek) return;

    try {
      setIsSubmitting(true);
      
      // 1. 팀 인증 (자동 등록)
      const res = await authService.verify({
        name,
        password,
        autoRegister: true,
      }) as { access_token: string, isNewTeam?: boolean };
      
      const { access_token, isNewTeam } = res;

      // 2. 토큰 저장
      loginTeam(access_token);

      // 3. 예약 생성
      // 선택된 날짜 + 시간 조합 (YYYY-MM-DD HH:mm)
      const startTime = selectedDate.hour(parseInt(selectedTime.split(':')[0])).minute(0).format('YYYY-MM-DD HH:mm');
      
      await createInstantReservation({ startTime });

      // 4. 성공 처리
      alert(isNewTeam ? `팀 등록과 함께 예약이 완료되었습니다!` : '예약이 완료되었습니다.');
      setIsAuthModalOpen(false);
      
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || '예약 처리에 실패했습니다.';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (weekLoading) return <div className="p-6 text-center text-text-sub">로딩 중...</div>;
  
  if (!currentWeek) {
    return (
      <PageContainer title="바로 예약">
        <EmptyState message="현재 예약 가능한 주차가 없습니다." />
      </PageContainer>
    );
  }

  return (
    <PageContainer title="바로 예약">
      <div className="sticky top-14 bg-bg-main z-30 pb-2">
        <WeekSelector
          currentWeek={currentWeek}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      </div>

      <div className="mt-4">
        {resLoading ? (
          <div className="text-center text-text-sub py-10">예약 정보를 불러오는 중...</div>
        ) : (
          <TimeSlotList
            selectedDate={selectedDate}
            reservations={reservations}
            onReserve={handleReserveClick}
          />
        )}
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSubmit={handleAuthSubmit}
        title="예약하기"
        isSubmitting={isSubmitting}
      />
    </PageContainer>
  );
}
