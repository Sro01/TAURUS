import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeam, useReservation, useAuth } from '../../hooks';
import { PageContainer, Button, EmptyState } from '../../components/common';
import TeamInfoCard from '../../components/domain/team/TeamInfoCard';
import TeamReservationList from '../../components/domain/team/TeamReservationList';
import { AlertCircle } from 'lucide-react';

export default function TeamDetailPage() {
  const navigate = useNavigate();
  const { logoutTeam } = useAuth();
  
  // 훅
  const { myTeam, loading: teamLoading, fetchMyTeam, deleteTeam } = useTeam();
  const { myReservations, loading: resLoading, getMyReservations, cancelReservation } = useReservation();

  // 상태
  const [isDeleting, setIsDeleting] = useState(false);
  
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

  return (
    <PageContainer title="팀 관리">
      {/* 1. 팀 정보 대시보드 */}
      <TeamInfoCard 
        team={myTeam} 
        onLogout={handleLogout} 
        onUpdate={fetchMyTeam} 
      />

      {/* 2. 내 예약 목록 */}
      <TeamReservationList 
        reservations={myReservations} 
        loading={resLoading} 
        onCancel={handleCancelReservation} 
      />

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
    </PageContainer>
  );
}
