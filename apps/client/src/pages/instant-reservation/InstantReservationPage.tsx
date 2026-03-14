import dayjs from '../../utils/dayjs';
import { useAuth } from '../../hooks';
import { useReservationPage } from '../../hooks/useReservationPage';
import { useReservationAction } from '../../hooks/useReservationAction';
import { PageContainer, PageTitle } from '../../components/common';
import ReservationPageLayout from '../../components/domain/reservation/ReservationPageLayout';

export default function InstantReservationPage() {
  const { teamName, teamPassword } = useAuth();
  
  const {
    weekData,
    loading,
    reservations,
    selectedDate,
    handleDateSelect,
    refreshReservations
  } = useReservationPage({ weekType: 'current' });

  const {
    isAuthModalOpen,
    initiateReservation,
    handleAuthSubmit,
    closeModal,
    pendingReservation
  } = useReservationAction({
    type: 'INSTANT',
    onSuccess: refreshReservations,
  });

  const handleTimeSlotClick = (timeStr: string) => {
    // timeStr: "09:00" -> HH:mm
    const [hour, minute] = timeStr.split(':').map(Number);
    const formattedStartTime = dayjs(selectedDate)
        .hour(hour)
        .minute(minute)
        .format('YYYY-MM-DD HH:mm');

    initiateReservation(formattedStartTime);
  };

  // 모달에 표시할 시간 (HH:mm) 추출
  const selectedTimeStr = pendingReservation 
    ? dayjs(pendingReservation.startTime).format('HH:mm') 
    : null;
  
  return (
    <PageContainer>
      <PageTitle
        title="바로 예약"
        description="오늘부터 예약 가능한 시간대를 선택해 바로 예약하세요."
      />
      <ReservationPageLayout
        weekData={weekData}
        loading={loading}
        reservations={reservations}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        onTimeSlotClick={handleTimeSlotClick}
        banner={{
          label: "This Week",
          weeks: weekData?.weekNumber || 0,
          startDate: weekData?.startDate || '',
          endDate: weekData?.endDate || '',
          theme: 'red'
        }}
        modalProps={{
          isOpen: isAuthModalOpen,
          onClose: closeModal,
          selectedTime: selectedTimeStr,
          onSubmit: handleAuthSubmit,
          teamName,
          teamPassword,
          showWaitlist: false,
          existingReservations: reservations
        }}
      />
    </PageContainer>
  );
}
