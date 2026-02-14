import { useTeamPage } from '../../hooks/useTeamPage';
import { PageContainer, Button, EmptyState } from '../../components/common';
import TeamInfoCard from '../../components/domain/team/TeamInfoCard';
import TeamReservationList from '../../components/domain/team/TeamReservationList';
import { TriangleAlert } from 'lucide-react';

export default function TeamDetailPage() {
  const {
    myTeam,
    myReservations,
    loading,
    isDeleting,
    fetchMyTeam,
    handleCancelReservation,
    handleDeleteTeam,
    handleLogout,
    handleNavigateHome,
  } = useTeamPage();

  if (loading) return <div className="p-6 text-center text-text-sub">로딩 중...</div>;
  
  if (!myTeam) {
    return (
      <PageContainer title="팀 관리">
         <EmptyState 
           message="팀 정보를 불러올 수 없습니다. 다시 로그인해주세요." 
           action={<Button onClick={handleNavigateHome}>홈으로</Button>}
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
        loading={loading} 
        onCancel={handleCancelReservation} 
      />

      {/* 3. 위험 구역 (팀 탈퇴) */}
      <div className="border-t border-white/10 pt-6 mt-6 flex items-center gap-2">
        <TriangleAlert className="w-4 h-4" />
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
