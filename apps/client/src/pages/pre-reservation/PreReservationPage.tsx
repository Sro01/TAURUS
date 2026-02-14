import dayjs from '../../utils/dayjs';
import { useAuth } from '../../hooks';
import { useReservationPage } from '../../hooks/useReservationPage';
import { useReservationAction } from '../../hooks/useReservationAction';
import ReservationPageLayout from '../../components/domain/reservation/ReservationPageLayout';

export default function PreReservationPage() {
  const { teamName, teamPassword } = useAuth();
  
  const {
    weekData,
    loading,
    reservations,
    selectedDate,
    handleDateSelect,
    refreshReservations
  } = useReservationPage({ weekType: 'next' });

  const {
    isAuthModalOpen,
    initiateReservation,
    handleAuthSubmit,
    closeModal,
    pendingReservation
  } = useReservationAction({
    type: 'PRE',
    onSuccess: refreshReservations,
  });

  const handleTimeSlotClick = (timeStr: string) => {
    // timeStr: "09:00" -> HH:mm
    const [hour, minute] = timeStr.split(':').map(Number);
    // 미리 예약은 보통 정각 단위로 이루어지므로 minute=0, second=0, millisecond=0
    // 기존 로직에서도 hour(selectedSlotId).minute(0)...
    const startTimeResult = dayjs(selectedDate)
        .hour(hour)
        .minute(minute)
        .second(0)
        .millisecond(0);
        
    // 기존 PreReservationPage에서는 toISOString()을 사용
    initiateReservation(startTimeResult.toISOString());
  };

  // 모달 표시에 사용할 HH:mm 문자열 추출
  const selectedTimeStr = pendingReservation 
    ? dayjs(pendingReservation.startTime).format('HH:mm') 
    : null;

  return (
    <ReservationPageLayout
      title="미리 예약"
      weekData={weekData}
      loading={loading}
      reservations={reservations}
      selectedDate={selectedDate}
      onDateSelect={handleDateSelect}
      onTimeSlotClick={handleTimeSlotClick}
      
      banner={{
        label: "Next Week",
        weeks: weekData?.weekNumber || 0,
        startDate: weekData?.startDate || '',
        endDate: weekData?.endDate || '',
        theme: 'yellow'
      }}

      modalProps={{
        isOpen: isAuthModalOpen,
        onClose: closeModal,
        selectedTime: selectedTimeStr,
        onSubmit: handleAuthSubmit,
        teamName,
        teamPassword,
        showWaitlist: true,
        existingReservations: reservations
      }}
    />
  );
}
