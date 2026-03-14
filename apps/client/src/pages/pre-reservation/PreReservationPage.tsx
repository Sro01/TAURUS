import dayjs from '../../utils/dayjs';
import { useAuth } from '../../hooks';
import { useReservationPage } from '../../hooks/useReservationPage';
import { useReservationAction } from '../../hooks/useReservationAction';
import { PageContainer, PageTitle } from '../../components/common';
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
    const [hour, minute] = timeStr.split(':').map(Number);
    const startTimeResult = dayjs(selectedDate)
        .hour(hour)
        .minute(minute)
        .second(0)
        .millisecond(0);

    initiateReservation(startTimeResult.toISOString());
  };

  const selectedTimeStr = pendingReservation
    ? dayjs(pendingReservation.startTime).format('HH:mm')
    : null;

  return (
    <PageContainer>
      <PageTitle
        title="미리 예약"
        description="다음 주 예약을 미리 선점하세요."
      />
      <ReservationPageLayout
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
    </PageContainer>
  );
}
