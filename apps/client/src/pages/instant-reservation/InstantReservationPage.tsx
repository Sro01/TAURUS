import { useState, useEffect } from 'react';
import dayjs from '../../utils/dayjs';
import { useWeek, useReservation, useAuth } from '../../hooks';
import { PageContainer, EmptyState } from '../../components/common';
import WeekSelector from '../../components/domain/reservation/WeekSelector';
import TimeSlotList from '../../components/domain/reservation/TimeSlotList';
import ReservationModal from '../../components/domain/reservation/ReservationModal';
import { authService } from '../../services';

export default function InstantReservationPage() {
  // 상태
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isResModalOpen, setIsResModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 훅
  const { currentWeek, loading: weekLoading } = useWeek();
  const { 
    reservations, 
    loading: resLoading, 
    getReservations, 
    createInstantReservation 
  } = useReservation();
  const { loginTeam, teamName, teamPassword } = useAuth();

  // 주차 정보 로드되면 해당 주차의 예약 정보 가져오기
  useEffect(() => {
    if (currentWeek && currentWeek.weekNumber !== undefined) {
      getReservations(currentWeek.weekNumber.toString());
    } else if (currentWeek) {
      console.error('Current week is missing weekNumber:', currentWeek);
    }
  }, [currentWeek, getReservations]);

  // 예약 버튼 클릭 핸들러
  const handleReserveClick = (time: string) => {
    setSelectedTime(time);
    setIsResModalOpen(true);
  };

  // 모달 제출 핸들러 (인증 + 예약)
  const handleReservationSubmit = async (name: string, password: string) => {
    if (!selectedTime || !currentWeek) return;

    try {
      setIsSubmitting(true);
      
      // 1. 항상 인증 시도 (정보 갱신 또는 재인증)
      const res = await authService.verify({
          name,
          password,
          autoRegister: true,
      }) as { access_token: string, isNewTeam?: boolean };
      
      const { access_token, isNewTeam } = res;
      loginTeam(access_token, name, password); // 정보 및 토큰 갱신
      
      if (isNewTeam) alert('팀 등록이 완료되었습니다!');

      // 2. 예약 생성
      // 선택된 날짜 + 시간 조합 (YYYY-MM-DD HH:mm)
      const startTime = selectedDate.hour(parseInt(selectedTime.split(':')[0])).minute(0).format('YYYY-MM-DD HH:mm');
      
      await createInstantReservation({ startTime });

      // 3. 성공 처리
      alert('예약이 완료되었습니다.');
      setIsResModalOpen(false);
      
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || '예약 처리에 실패했습니다.';
      alert(`오류 발생: ${message}`);
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

      {selectedTime && (
        <ReservationModal
          isOpen={isResModalOpen}
          onClose={() => setIsResModalOpen(false)}
          selectedTime={selectedTime}
          selectedDate={selectedDate}
          existingReservations={reservations}
          isSubmitting={isSubmitting}

          teamName={teamName}
          teamPassword={teamPassword}
          onSubmit={handleReservationSubmit}
        />
      )}
    </PageContainer>
  );
}
