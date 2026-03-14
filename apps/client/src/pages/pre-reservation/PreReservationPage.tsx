import dayjs from '../../utils/dayjs';
import { useAuth } from '../../hooks';
import { useReservationPage } from '../../hooks/useReservationPage';
import { useReservationAction } from '../../hooks/useReservationAction';
import { InlineAlert, PageContainer, PageTitle } from '../../components/common';
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
      />
      <InlineAlert
          title="필독 사항"
          children={
            <div className="flex-col space-y-1">
              <p>• 미리 예약은 '다음 주' 합주 예약을 미리 예약 대기를 걸어둘 수 있습니다.</p>
              <p>• 예약 성공: 예약 대기 1팀 / 예약 실패: 예약 대기 2팀 이상 (수강신청 정원이 1명인 장바구니라고 보면 됨)</p>
              <p>• 주차 전환 시(매주 일요일 00시)에 예약 성공/실패 여부가 확정됩니다.</p>
              <p>• (주의!) 고의로 예약 실패를 유도하는 행위는 제재 대상이 될 수 있습니다.</p>
            </div>
          }
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
