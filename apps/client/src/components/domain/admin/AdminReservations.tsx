import { useState, useEffect, useMemo } from 'react';
import dayjs from '../../../utils/dayjs';
import { useWeek, useReservation } from '../../../hooks';
import { adminService } from '../../../services';
import { 
  Button, 
  Input, 
  Card, 
  Text, 
  Dropdown, 
  MultiDatePicker, 
  SectionHeader
} from '../../common';
import ReservationList from '../team/ReservationList';

export default function AdminReservations() {
  const { allWeeks, loading: weekLoading,refreshAllWeeks } = useWeek();
  const { reservations, loading: resLoading, getReservations } = useReservation();
  
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(0);
  const [selectedResIds, setSelectedResIds] = useState<string[]>([]);
  
  // Creation State
  const [selectedCreateDates, setSelectedCreateDates] = useState<string[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('09:00');
  const [adminResDesc, setAdminResDesc] = useState('');

  // Dropdown Options
  const weekOptions = useMemo(() => {
    if (!allWeeks) return [];
    return allWeeks.map(week => ({
      value: week.id.toString(),
      label: `${week.weekNumber}주차 (${dayjs(week.startDate).format('MM.DD')} ~ ${dayjs(week.endDate).format('MM.DD')})`
    }));
  }, [allWeeks]);

  const timeOptions = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => i + 9).map(h => {
      const timeStr = `${String(h).padStart(2, '0')}:00`;
      const endTimeStr = `${String(h).padStart(2, '0')}:50`;
      return {
        value: timeStr,
        label: `${timeStr} ~ ${endTimeStr}`
      };
    });
  }, []);

  /** 예약 취소 핸들러 (단건 — ReservationList의 일괄 취소에서도 사용) */
  const handleCancelReservation = async (id: string) => {
    try {
      await adminService.cancelReservation(id);
      if (selectedWeekNumber > 0) getReservations(selectedWeekNumber.toString());
    } catch (error: any) {
      console.error(error);
      const statusCode = error.response?.status || 500;
      throw new Error(String(statusCode)); // ReservationList 내부 일괄 취소에서 에러 상태코드 활용
    }
  };

  const handleCreateAdminReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCreateDates.length === 0) return alert('날짜를 최소 하나 이상 선택해주세요.');
    if (!adminResDesc) return alert('점유 사유를 입력해주세요.');

    if (!confirm(`선택한 ${selectedCreateDates.length}일의 ${selectedTimeSlot} 시간대를 관리자 점유로 설정하시겠습니까?`)) return;

    try {
      for (const dateStr of selectedCreateDates) {
        const startTime = dayjs(`${dateStr}T${selectedTimeSlot}`).toISOString();
        await adminService.createReservation({
          startTime,
          description: adminResDesc
        });
      }
      
      if (selectedWeekNumber > 0) getReservations(selectedWeekNumber.toString());
      setSelectedCreateDates([]);
      setAdminResDesc('');
      alert('관리자 예약이 생성되었습니다.');
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || '예약 생성 실패';
      alert(`오류 발생: ${message}`);
    }
  };

  // Initial Load
  useEffect(() => {
    refreshAllWeeks();
  }, [refreshAllWeeks]);

  useEffect(() => {
    if (!weekLoading && allWeeks && allWeeks.length > 0 && selectedWeekNumber === 0) {
       const today = dayjs();
       const current = allWeeks.find(w => 
         (today.isSame(w.startDate, 'day') || today.isAfter(w.startDate)) && 
         (today.isSame(w.endDate, 'day') || today.isBefore(w.endDate))
       );

       if (current) {
         setSelectedWeekNumber(current.weekNumber);
       } else {
         // Fallback to latest week if today is not within any range
         const latest = [...allWeeks].sort((a, b) => b.weekNumber - a.weekNumber)[0];
         setSelectedWeekNumber(latest.weekNumber);
       }
    }
  }, [allWeeks, weekLoading, selectedWeekNumber]);

  useEffect(() => {
    if (selectedWeekNumber > 0) {
      getReservations(selectedWeekNumber.toString());
      setSelectedResIds([]);
    }
  }, [selectedWeekNumber, getReservations]);

  return (
    <div className="space-y-10">
      {/* 1. 예약하기 섹션 */}
      <section className="space-y-6">
        <SectionHeader title="관리자 권한으로 예약하기" description="관리자 예약은 바로 확정되며, 기존 예약을 덮어씌웁니다." />
        <Card className="p-6 md:p-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* 날짜 선택 */}
            <div className="space-y-4">
              <Text variant="label" color="sub">날짜 선택 (복수 선택 가능)</Text>
              <MultiDatePicker 
                selectedDates={selectedCreateDates}
                onChange={setSelectedCreateDates}
              />
            </div>

            {/* 시간 및 정보 입력 */}
            <div className="space-y-6">
              <Dropdown 
                label="시간대 선택"
                options={timeOptions}
                value={selectedTimeSlot}
                onChange={setSelectedTimeSlot}
              />

              <Input 
                label="점유 사유"
                type="text"
                value={adminResDesc}
                onChange={(e) => setAdminResDesc(e.target.value)}
                placeholder="예: 베이스 레슨"
                required
              />

              <div className="pt-4">
                <Button 
                  onClick={handleCreateAdminReservation} 
                  fullWidth 
                  size="lg"
                  disabled={selectedCreateDates.length === 0}
                >
                  {selectedCreateDates.length > 0 
                    ? `${selectedCreateDates.length}일 일괄 예약하기` 
                    : '날짜를 선택해주세요'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 2. 주차별 예약 조회 섹션 — ReservationList 컴포넌트 활용 */}
      <section className="space-y-6">
          <SectionHeader title="주차별 예약 현황" description="각 주차별로 모든 예약 현황을 조회합니다." />
          <div className="w-full sm:w-64 sm:ml-auto">
              <Dropdown 
                options={weekOptions}
                value={selectedWeekNumber}
                onChange={(val) => setSelectedWeekNumber(Number(val))}
                fullWidth
              />
          </div>

        <ReservationList
          reservations={reservations}
          loading={resLoading}
          onCancel={handleCancelReservation}
          selectable
          selectedIds={selectedResIds}
          onSelectionChange={setSelectedResIds}
          showTeamName
          showHeader={false}
        />
      </section>
    </div>
  );
}

