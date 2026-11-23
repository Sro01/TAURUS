import { useState, useEffect, useMemo } from 'react';
import dayjs from '../../../utils/dayjs';
import { useWeek, useReservation } from '../../../hooks';
import { adminService } from '../../../services';
import { getJamErrorStatus } from '../../../services/jamApi';
import { Dropdown, SectionHeader } from '../../common';
import ReservationList from '../team/ReservationList';
import AdminReservationCreate from './AdminReservationCreate';

export default function AdminReservations() {
  const { allWeeks, loading: weekLoading, refreshAllWeeks } = useWeek();
  const { reservations, loading: resLoading, getReservations } = useReservation();
  
  const [selectedWeekId, setSelectedWeekId] = useState<number>(0);
  const [selectedResIds, setSelectedResIds] = useState<string[]>([]);
  
  // Dropdown Options
  const weekOptions = useMemo(() => {
    if (!allWeeks) return [];
    return allWeeks.map(week => ({
      value: week.id.toString(),
      label: `${week.weekNumber}주차 (${dayjs(week.startDate).format('MM.DD')} ~ ${dayjs(week.endDate).format('MM.DD')})`
    }));
  }, [allWeeks]);

  const refreshSelectedWeek = () => {
    if (selectedWeekId > 0) getReservations(selectedWeekId.toString());
  };

  /** 예약 취소 핸들러 (단건 — ReservationList의 일괄 취소에서도 사용) */
  const handleCancelReservation = async (id: string) => {
    try {
      await adminService.cancelReservation(id);
      refreshSelectedWeek();
    } catch (error) {
      console.error(error);
      const statusCode = getJamErrorStatus(error) ?? 500;
      throw new Error(String(statusCode)); // ReservationList 내부 일괄 취소에서 에러 상태코드 활용
    }
  };

  // Initial Load
  useEffect(() => {
    refreshAllWeeks();
  }, [refreshAllWeeks]);

  useEffect(() => {
    if (!weekLoading && allWeeks && allWeeks.length > 0 && selectedWeekId === 0) {
       const today = dayjs();
       const current = allWeeks.find(w => 
         (today.isSame(w.startDate, 'day') || today.isAfter(w.startDate)) && 
         (today.isSame(w.endDate, 'day') || today.isBefore(w.endDate))
       );

       if (current) {
         setSelectedWeekId(current.id);
       } else {
         // Fallback to latest week if today is not within any range
         const latest = [...allWeeks].sort((a, b) => b.weekNumber - a.weekNumber)[0];
         setSelectedWeekId(latest.id);
       }
    }
  }, [allWeeks, weekLoading, selectedWeekId]);

  useEffect(() => {
    if (selectedWeekId > 0) {
      getReservations(selectedWeekId.toString());
      setSelectedResIds([]);
    }
  }, [selectedWeekId, getReservations]);

  return (
    <div className="space-y-10">
      {/* 1. 예약하기 섹션 */}
      <section>
        <AdminReservationCreate onCreated={refreshSelectedWeek} />
      </section>

      {/* 2. 주차별 예약 조회 섹션 — ReservationList 컴포넌트 활용 */}
      <section className="space-y-6">
          <SectionHeader title="주차별 예약 현황" description="각 주차별로 모든 예약 현황을 조회합니다." />
          <div className="w-full sm:w-64 sm:ml-auto">
              <Dropdown 
                options={weekOptions}
                value={selectedWeekId}
                onChange={(val) => setSelectedWeekId(Number(val))}
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

