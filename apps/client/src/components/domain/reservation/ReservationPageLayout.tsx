import dayjs from '../../../utils/dayjs';
import { PageContainer, EmptyState, Button } from '../../common';
import WeekSelector from './WeekSelector';
import TimeSlotList from './TimeSlotList';
import ReservationModal from './ReservationModal';
import { Week } from '../../../types/week';
import { Reservation } from '../../../types/reservation';
import { useNavigate } from 'react-router-dom';

interface ReservationPageLayoutProps {
  title: string;
  weekData: Week | null;
  loading: boolean;
  error?: any;
  reservations: Reservation[];
  selectedDate: dayjs.Dayjs;
  onDateSelect: (date: dayjs.Dayjs) => void;
  onTimeSlotClick: (time: string) => void;
  
  // Banner Config
  banner?: {
    label: string;
    weeks: number;
    startDate: string;
    endDate: string;
    theme: 'red' | 'yellow'; // 'red' for current/urgent, 'yellow' for future
  };

  // Modal Props
  modalProps: {
    isOpen: boolean;
    onClose: () => void;
    selectedTime: string | null;
    onSubmit: (name: string, password: string) => Promise<void>;
    isSubmitting?: boolean;
    teamName?: string | null;
    teamPassword?: string | null;
    showWaitlist?: boolean;
    existingReservations?: Reservation[]; 
  };
}

export default function ReservationPageLayout({
  title,
  weekData,
  loading,
  error,
  reservations,
  selectedDate,
  onDateSelect,
  onTimeSlotClick,
  banner,
  modalProps
}: ReservationPageLayoutProps) {
  const navigate = useNavigate();

  if (error) {
    return (
        <PageContainer title={title}>
          <EmptyState 
             message="오류가 발생했습니다. 잠시 후 다시 시도해주세요." 
             action={<Button onClick={() => window.location.reload()}>새로고침</Button>}
          />
        </PageContainer>
    );
  }

  // 에러 또는 데이터 없음 처리
  if (!loading && !weekData) {
    return (
        <PageContainer title={title}>
          <EmptyState 
             message="예약 가능한 주차 정보를 불러올 수 없습니다." 
             action={<Button onClick={() => navigate('/')}>홈으로</Button>}
          />
        </PageContainer>
    );
  }

  return (
    <PageContainer title={title}>
      {/* Banner Area */}
      {banner && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
            banner.theme === 'yellow' ? 'bg-yellow-700/10 text-yellow-600' : 'bg-red-700/10 text-red-600'
        }`}>
          <span className="font-bold">{banner.label}:</span> {banner.weeks}주차 
          ({dayjs(banner.startDate).format('MM.DD')} ~ {dayjs(banner.endDate).format('MM.DD')})
        </div>
      )}

      {/* Week Selector */}
      {weekData && (
          <div className="sticky top-14 z-30">
            <WeekSelector 
            currentWeek={weekData}
            selectedDate={selectedDate}
            onSelectDate={onDateSelect}
            />
          </div>
      )}

      {/* Time Slot List */}
      <div className="mt-4">
        {loading ? (
          <div className="text-center text-text-sub py-10">예약 정보를 불러오는 중...</div>
        ) : (
          <TimeSlotList 
            reservations={reservations}
            onReserve={onTimeSlotClick}
            selectedDate={selectedDate}
          />
        )}
      </div>

      {/* Modal */}
      {modalProps.selectedTime && (
        <ReservationModal
          isOpen={modalProps.isOpen}
          onClose={modalProps.onClose}
          selectedTime={modalProps.selectedTime}
          selectedDate={selectedDate}
          existingReservations={modalProps.existingReservations || reservations}
          onSubmit={modalProps.onSubmit}
          isSubmitting={modalProps.isSubmitting}
          teamName={modalProps.teamName}
          teamPassword={modalProps.teamPassword}
          showWaitlist={modalProps.showWaitlist}
        />
      )}
    </PageContainer>
  );
}
