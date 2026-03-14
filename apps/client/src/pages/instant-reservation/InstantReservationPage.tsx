import dayjs from '../../utils/dayjs';
import { useAuth } from '../../hooks';
import { useReservationPage } from '../../hooks/useReservationPage';
import { useReservationAction } from '../../hooks/useReservationAction';
import { InlineAlert, PageContainer, PageTitle } from '../../components/common';
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
      />
      <InlineAlert
        title="바로 예약 페이지 이용 시 필독 사항"
        children={
          <div className="flex-col space-y-1 text-white/85">
            <p>• 바로 예약은 <span className="font-semibold text-white">이번 주</span> 합주 예약을 <span className="font-semibold text-white">즉시 확정</span>합니다.</p>
            <p>• <span className="font-semibold text-white">매주 일요일 00시</span>에 주차가 전환 되며, <span className="font-semibold text-white">선착순</span>으로 진행됩니다.</p>
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
