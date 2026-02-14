import { useAdminPage, AdminTab } from '../../hooks/useAdminPage';
import { PageContainer, Button } from '../../components/common';
import NavigationBar, { TabItem } from '../../components/common/NavigationBar';
import AuthModal from '../../components/domain/auth/AuthModal';
import { Settings, Users as UsersIcon, Calendar, LogOut } from 'lucide-react';
import AdminReservations from '../../components/domain/admin/AdminReservations';
import AdminSettings from '../../components/domain/admin/AdminSettings';
import AdminTeams from '../../components/domain/admin/AdminTeams';

export default function AdminPage() {
  const {
    activeTab,
    setActiveTab,
    isAuthModalOpen,
    handleAuthSubmit,
    handleLogout,
    handleNavigateHome,
    isAdminAuthenticated
  } = useAdminPage();

  const tabs: TabItem[] = [
    { id: 'reservations', label: '예약 관리', icon: Calendar },
    { id: 'teams', label: '팀 관리', icon: UsersIcon },
    { id: 'settings', label: '시스템 설정', icon: Settings },
  ];

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="text-center">
          <p className="text-text-sub mb-4">관리자 페이지 접근 권한이 필요합니다.</p>
          <Button onClick={handleNavigateHome}>홈으로 돌아가기</Button>
        </div>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={handleNavigateHome}
          onSubmit={handleAuthSubmit}
          title="관리자 인증"
          hideNameField
        />
      </div>
    );
  }

  return (
    <PageContainer title="관리자 대시보드">
      {/* 상단 네비게이션 */}
        <NavigationBar<AdminTab>
          tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
        />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-bg-card p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2 w-full sm:w-auto">
           <Button variant="ghost" onClick={handleLogout} className="text-sm p-2 text-text-sub hover:text-error">
             <LogOut className="w-5 h-5" />
           </Button>
        </div>
      </div>

      {/* 예약 관리 탭 */}
      {activeTab === 'reservations' && <AdminReservations />}

      {/* 시스템 설정 탭 */}
      {activeTab === 'settings' && <AdminSettings />}

      {/* 팀 관리 탭 */}
      {activeTab === 'teams' && <AdminTeams />}
      
    </PageContainer>
  );
}
