import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from '../../utils/dayjs';
import { useTeam, useReservation, useAuth } from '../../hooks';
import { PageContainer, Card, Button, EmptyState } from '../../components/common';
import { Trash2, AlertCircle } from 'lucide-react';

export default function TeamDetailPage() {
  const navigate = useNavigate();
  const { logoutTeam } = useAuth();
  
  // 훅
  const { myTeam, loading: teamLoading, fetchMyTeam, deleteTeam } = useTeam();
  const { myReservations, loading: resLoading, getMyReservations, cancelReservation } = useReservation();

  // 상태
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<'name' | 'password'>('name');
  const [editValue, setEditValue] = useState('');
  
  // 데이터 로드
  useEffect(() => {
    fetchMyTeam();
    getMyReservations();
  }, [fetchMyTeam, getMyReservations]);

  // 예약 취소 핸들러
  const handleCancelReservation = async (id: string) => {
    if (!confirm('정말로 예약을 취소하시겠습니까?')) return;
    try {
      await cancelReservation(id);
      getMyReservations();
    } catch (error) {
      console.error(error);
      alert('예약 취소에 실패했습니다.');
    }
  };

  // 팀 탈퇴 핸들러
  const handleDeleteTeam = async () => {
    if (!confirm('정말로 팀을 삭제하시겠습니까? 예약된 내역도 모두 삭제됩니다.')) return;
    try {
      setIsDeleting(true);
      await deleteTeam();
      logoutTeam();
      alert('팀이 삭제되었습니다.');
      navigate('/');
    } catch (error) {
      console.error(error);
      alert('팀 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  // 로그아웃 핸들러
  const handleLogout = () => {
    logoutTeam();
    navigate('/');
  };

  // 팀 정보 수정 핸들러
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { teamService } = await import('../../services');
      if (editMode === 'name') {
        await teamService.updateName(editValue);
        alert('팀 이름이 변경되었습니다.');
      } else {
        await teamService.updatePassword(editValue);
        alert('비밀번호가 변경되었습니다.');
      }
      setIsEditModalOpen(false);
      setEditValue('');
      fetchMyTeam();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || '수정에 실패했습니다.');
    }
  };

  const openEditModal = (mode: 'name' | 'password') => {
    setEditMode(mode);
    setEditValue('');
    setIsEditModalOpen(true);
  };

  if (teamLoading) return <div className="p-6 text-center text-text-sub">로딩 중...</div>;
  if (!myTeam) {
    return (
      <PageContainer title="팀 관리">
         <EmptyState 
           message="팀 정보를 불러올 수 없습니다. 다시 로그인해주세요." 
           action={<Button onClick={() => navigate('/')}>홈으로</Button>}
         />
      </PageContainer>
    );
  }

  // 예약 내역 정렬 (최신순)
  const sortedReservations = [...myReservations].sort((a, b) => 
    dayjs(b.startTime).valueOf() - dayjs(a.startTime).valueOf()
  );

  return (
    <PageContainer title="팀 관리">
      {/* 1. 팀 정보 대시보드 */}
      <Card className="p-6 mb-8 border-primary/20 bg-bg-card/80">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm text-text-sub mb-1">Team</h3>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-3xl font-bold text-primary">{myTeam.name}</h2>
              <button 
                onClick={() => openEditModal('name')}
                className="text-xs text-text-sub hover:text-white underline"
              >
                수정
              </button>
            </div>
            
            <div className="flex gap-4 text-xs text-text-sub">
               <span>가입일: {dayjs(myTeam.createdAt).format('YYYY.MM.DD')}</span>
               <button 
                  onClick={() => openEditModal('password')}
                  className="hover:text-white underline"
                >
                  비밀번호 변경
                </button>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="text-xs py-1 px-3 h-auto">
            로그아웃
          </Button>
        </div>
      </Card>

      {/* 2. 내 예약 목록 */}
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        내 예약 현황
        <span className="text-xs font-normal text-text-sub bg-white/10 px-2 py-0.5 rounded-full">
          {myReservations.length}
        </span>
      </h3>

      <div className="space-y-3 mb-12">
        {resLoading ? (
          <div className="text-center text-text-sub py-4">불러오는 중...</div>
        ) : sortedReservations.length === 0 ? (
          <EmptyState message="예약 내역이 없습니다." />
        ) : (
          sortedReservations.map((res) => {
            const startTime = dayjs(res.startTime);
            const isPast = startTime.isBefore(dayjs());
            const isCancelled = res.status === 'CANCELLED';

            return (
              <Card key={res.id} className={`p-4 flex items-center justify-between ${isCancelled ? 'opacity-50' : ''}`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-bold ${isPast ? 'text-text-sub' : 'text-text-main'}`}>
                      {startTime.format('M월 D일 (ddd)')}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      res.status === 'CONFIRMED' ? 'bg-success/20 text-success' :
                      res.status === 'PENDING' ? 'bg-primary/20 text-primary' :
                      'bg-white/10 text-text-sub'
                    }`}>
                      {res.status === 'CONFIRMED' ? '예약 확정' : 
                       res.status === 'PENDING' ? '승인 대기' : '취소됨'}
                    </span>
                  </div>
                  <div className="text-xl font-mono font-medium">
                    {startTime.format('HH:00')} ~ {dayjs(res.endTime).format('HH:00')}
                  </div>
                </div>

                {!isPast && !isCancelled && (
                  <button 
                    onClick={() => handleCancelReservation(res.id)}
                    className="p-2 text-text-sub hover:text-error hover:bg-error/10 rounded-full transition-colors"
                    title="예약 취소"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* 3. 위험 구역 (팀 탈퇴) */}
      <div className="border-t border-white/10 pt-6 mt-6">
        <h3 className="text-sm font-bold text-text-sub mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> 위험 구역
        </h3>
        <button 
          onClick={handleDeleteTeam}
          disabled={isDeleting}
          className="text-sm text-text-sub hover:text-error underline transition-colors disabled:opacity-50"
        >
          {isDeleting ? '삭제 중...' : '팀 삭제 및 탈퇴하기'}
        </button>
      </div>

      {/* 정보 수정 모달 */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-bg-card w-full max-w-sm p-6 rounded-2xl shadow-xl border border-white/10">
            <h3 className="text-xl font-bold mb-4">
              {editMode === 'name' ? '팀 이름 변경' : '비밀번호 변경'}
            </h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-text-sub mb-1">
                  {editMode === 'name' ? '새로운 팀 이름' : '새로운 비밀번호'}
                </label>
                <input 
                  type={editMode === 'name' ? 'text' : 'password'}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full bg-bg-main border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="ghost" fullWidth onClick={() => setIsEditModalOpen(false)}>취소</Button>
                <Button type="submit" fullWidth>변경</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
