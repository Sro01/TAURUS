import { useState, useEffect } from 'react';
import dayjs from '../../../utils/dayjs';
import { useWeek, useReservation } from '../../../hooks';
import { adminService } from '../../../services';
import { Card, Button, Modal, Input } from '../../common';
import { Calendar, Trash2, Clock, Info } from 'lucide-react';

export default function AdminReservations() {
  const { allWeeks, loading: weekLoading, refreshAllWeeks } = useWeek();
  const { reservations, loading: resLoading, getReservations } = useReservation();
  
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(0);
  const [isAdminResModalOpen, setIsAdminResModalOpen] = useState(false);
  const [adminResDate, setAdminResDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [adminResTime, setAdminResTime] = useState('09:00');
  const [adminResDesc, setAdminResDesc] = useState('');

  // 주차 목록 로드되면 최신 주차 선택
  useEffect(() => {
    refreshAllWeeks();
  }, [refreshAllWeeks]);

  useEffect(() => {
    if (allWeeks && allWeeks.length > 0 && selectedWeekNumber === 0) {
       const latest = [...allWeeks].sort((a, b) => b.weekNumber - a.weekNumber)[0];
       setSelectedWeekNumber(latest.weekNumber);
    }
  }, [allWeeks, selectedWeekNumber]);

  // 주차 변경 시 예약 조회
  useEffect(() => {
    if (selectedWeekNumber > 0) {
      getReservations(selectedWeekNumber.toString());
    }
  }, [selectedWeekNumber, getReservations]);

  const handleCreateAdminReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const startTime = dayjs(`${adminResDate}T${adminResTime}`).toISOString();
      await adminService.createReservation({
        startTime,
        description: adminResDesc
      });
      if (selectedWeekNumber > 0) getReservations(selectedWeekNumber.toString());
      setIsAdminResModalOpen(false);
      setAdminResDesc('');
      alert('관리자 예약이 생성되었습니다.');
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || '예약 생성 실패';
      alert(`오류 발생: ${message}`);
    }
  };

  const handleCancelReservation = async (id: string, teamName: string) => {
    if (!confirm(`'${teamName}' 팀의 예약을 취소하시겠습니까? (관리자 권한)`)) return;
    try {
      await adminService.cancelReservation(id); 
      if (selectedWeekNumber > 0) getReservations(selectedWeekNumber.toString());
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || '예약 취소 실패';
      alert(`오류 발생: ${message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* 상단 컨트롤 바 (주차 선택 + 예약 생성 버튼) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-bg-card p-4 rounded-xl border border-white/5">
        <div className="flex items-center gap-4 w-full sm:w-auto">
            <span className="text-sm font-medium text-text-sub shrink-0">주차 선택</span>
            <select
              value={selectedWeekNumber}
              onChange={(e) => setSelectedWeekNumber(Number(e.target.value))}
              className="w-full max-w-xs bg-bg-main border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-primary transition-colors"
            >
              <option value={0} disabled>주차를 선택하세요</option>
              {allWeeks?.map(week => (
                <option key={week.id} value={week.weekNumber}>
                  {week.weekNumber}주차 ({dayjs(week.startDate).format('MM.DD')} ~ {dayjs(week.endDate).format('MM.DD')})
                </option>
              ))}
            </select>
            {weekLoading && <span className="text-xs text-primary animate-pulse">업데이트 중...</span>}
        </div>
        
        <Button onClick={() => setIsAdminResModalOpen(true)} className="text-sm py-2 shrink-0">
           + 관리자 예약
        </Button>
      </div>

      {/* 예약 목록 */}
      <div className="space-y-3">
        {resLoading ? (
          <div className="text-center text-text-sub py-20 animate-pulse">예약 데이터를 불러오는 중...</div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-20 bg-bg-card/50 rounded-2xl border border-dashed border-white/10">
            <p className="text-text-sub">해당 주차에 예약이 없습니다.</p>
          </div>
        ) : (
          reservations.map(res => (
            <Card key={res.id} className="p-4 flex items-center justify-between group hover:bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${
                  res.type === 'ADMIN' ? 'bg-warning/10 text-warning' :
                  res.status === 'CONFIRMED' ? 'bg-success/10 text-success' :
                  'bg-primary/10 text-primary'
                }`}>
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold text-white">
                      {res.teamName || (res.type === 'ADMIN' ? '관리자 점유' : 'Unknown Team')}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${
                      res.status === 'CONFIRMED' ? 'bg-success/20 text-success' :
                      res.status === 'PENDING' ? 'bg-primary/20 text-primary' :
                      'bg-white/10 text-text-sub'
                    }`}>
                      {res.type === 'ADMIN' ? 'ADMIN' : res.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-sub font-mono">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {dayjs(res.startTime).format('M/D(ddd) HH:mm')} ~ {dayjs(res.endTime).format('HH:mm')}
                    </div>
                    {res.type === 'ADMIN' && (
                      <div className="flex items-center gap-1 text-warning/70">
                        <Info className="w-3 h-3" />
                        {res.description || '관리자 메모 없음'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleCancelReservation(res.id, res.teamName || (res.type === 'ADMIN' ? '관리자' : '알 수 없는 팀'))}
                className="p-3 text-text-sub hover:text-error hover:bg-error/10 rounded-xl transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </Card>
          ))
        )}
      </div>

      {/* 관리자 예약 모달 */}
      <Modal
        isOpen={isAdminResModalOpen}
        onClose={() => setIsAdminResModalOpen(false)}
        title="관리자 권한 직접 예약"
      >
        <form onSubmit={handleCreateAdminReservation} className="space-y-5">
           <Input 
             label="날짜 선택"
             type="date"
             value={adminResDate}
             onChange={(e) => setAdminResDate(e.target.value)}
             required
           />
           <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-sub ml-1">불가피한 점유 시간대</label>
              <select 
                value={adminResTime} 
                onChange={(e) => setAdminResTime(e.target.value)}
                className="w-full bg-bg-main border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary"
              >
                {Array.from({ length: 14 }, (_, i) => i + 9).map(h => {
                  const val = `${String(h).padStart(2, '0')}:00`;
                  return (
                    <option key={h} value={val}>
                      {h}:00 ~ {h}:50
                    </option>
                  );
                })}
              </select>
           </div>
           <Input 
             label="점유 사유 (사용자 노출)"
             type="text"
             value={adminResDesc}
             onChange={(e) => setAdminResDesc(e.target.value)}
             placeholder="예: 서버 정기 점검"
             required
           />
           <div className="flex gap-2 pt-4">
             <Button type="button" variant="ghost" fullWidth onClick={() => setIsAdminResModalOpen(false)}>취소</Button>
             <Button type="submit" fullWidth>예약 생성</Button>
           </div>
        </form>
      </Modal>
    </div>
  );
}
