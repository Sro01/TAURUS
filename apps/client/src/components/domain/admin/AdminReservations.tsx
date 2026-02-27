import { useState, useEffect, useMemo } from 'react';
import dayjs from '../../../utils/dayjs';
import { useWeek, useReservation } from '../../../hooks';
import { adminService } from '../../../services';
import { 
  Button, 
  Input, 
  Checkbox, 
  Badge, 
  ListRow, 
  Card, 
  Text, 
  Dropdown, 
  MultiDatePicker, 
  SectionHeader
} from '../../common';
import BulkActionBar from './BulkActionBar';
import { Info } from 'lucide-react';

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
      value: week.weekNumber.toString(),
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

  // Handlers
  const toggleSelection = (id: string) => {
    setSelectedResIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleBulkCancel = async () => {
    if (!confirm(`선택한 ${selectedResIds.length}개의 예약을 정말 취소하시겠습니까?`)) return;
    try {
      await Promise.all(selectedResIds.map(id => adminService.cancelReservation(id)));
      if (selectedWeekNumber > 0) getReservations(selectedWeekNumber.toString());
      setSelectedResIds([]);
      alert('일괄 취소가 완료되었습니다.');
    } catch (error) {
      console.error(error);
      alert('일부 예약 취소에 실패했습니다.');
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
    <div className="space-y-10 pb-20">
      {/* 1. 예약하기 섹션 */}
      <section className="space-y-6">
        <SectionHeader title="관리자 예약" description="관리자 예약은 바로 확정되며, 기존 예약을 덮어씌웁니다." />
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

      {/* 2. 주차별 예약 조회 섹션 */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <Text variant="h3" className="border-0 pb-0">주차별 예약 조회</Text>
          <div className="w-full sm:w-64">
            <Dropdown 
              options={weekOptions}
              value={selectedWeekNumber}
              onChange={(val) => setSelectedWeekNumber(Number(val))}
              fullWidth
            />
          </div>
        </div>

        <div className="relative">
          {resLoading ? (
            <div className="text-center text-text-sub py-20 animate-pulse">예약 데이터를 불러오는 중...</div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-20 bg-bg-card/30 rounded-2xl border border-dashed border-white/5">
              <Text color="sub" align="center">해당 주차에 예약이 없습니다.</Text>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-2 mb-2">
                 <Checkbox 
                   checked={selectedResIds.length === reservations.length && reservations.length > 0}
                   onChange={(e) => {
                     if (e.target.checked) {
                       setSelectedResIds(reservations.map(r => r.id));
                     } else {
                       setSelectedResIds([]);
                     }
                   }}
                   label="전체 선택"
                   className="text-xs text-text-sub"
                 />
              </div>

              {reservations.map(res => {
                const start = dayjs(res.startTime);
                const end = dayjs(res.endTime);
                const isSelected = selectedResIds.includes(res.id);

                return (
                  <ListRow
                    key={res.id}
                    className={`transition-colors ${isSelected ? 'bg-primary/5 border-primary/30' : ''}`}
                    onClick={() => toggleSelection(res.id)}
                    left={
                      <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                         <Checkbox 
                           checked={isSelected}
                           onChange={() => toggleSelection(res.id)}
                         />
                      </div>
                    }
                    center={
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <Text weight="bold" className="text-base">
                            {res.teamName || (res.type === 'ADMIN' ? '관리자 점유' : 'Unknown Team')}
                          </Text>
                          <Badge variant={
                            res.type === 'ADMIN' ? 'brand' : 
                            res.status === 'CONFIRMED' ? 'success' : 
                            res.status === 'PENDING' ? 'warn' : 'default'
                          }>
                            {res.type === 'ADMIN' ? 'ADMIN' : res.status}
                          </Badge>
                        </div>
                        <div className="flex flex-col items-start gap-1 text-xs text-text-sub font-mono">
                           <span>{start.format('M/D(ddd) HH:mm')} ~ {end.format('HH:mm')}</span>
                          {res.description && (
                            <span className="flex items-center gap-1">
                              <Info size={12} /> {res.description}
                            </span>
                          )}
                        </div>
                      </div>
                    }
                  />
                );
              })}
            </>
          )}
          
          <BulkActionBar 
            selectedCount={selectedResIds.length}
            onClear={() => setSelectedResIds([])}
            onDelete={selectedResIds.length > 0 ? handleBulkCancel : undefined}
          />
        </div>
      </section>
    </div>
  );
}
