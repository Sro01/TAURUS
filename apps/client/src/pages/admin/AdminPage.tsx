import { useAdminPage, AdminTab } from '../../hooks/useAdminPage';
import { PageContainer, PageTitle, Button } from '../../components/common';
import NavigationBar, { TabItem } from '../../components/common/NavigationBar';
import AuthModal from '../../components/domain/auth/AuthModal';
import AdminReservations from '../../components/domain/admin/AdminReservations';
import AdminSettings from '../../components/domain/admin/AdminSettings';
import AdminTeams from '../../components/domain/admin/AdminTeams';

export default function AdminPage() {
  const {
    activeTab,
    setActiveTab,
    isAuthModalOpen,
    handleAuthSubmit,
    handleNavigateHome,
    handleLogout,
    isAdminAuthenticated
  } = useAdminPage();

  const tabs: TabItem[] = [
    { id: 'reservations', label: '예약 관리' },
    { id: 'teams', label: '팀 관리' },
    { id: 'settings', label: '시스템 설정' },
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
    <PageContainer>
      {/* 1. Header & Logout */}
      <PageTitle
        title="관리자 페이지"
        action={
          <Button variant="outline" size="sm" onClick={handleLogout}>
            로그아웃
          </Button>
        }
      />
      {/* 상단 네비게이션 */}
        <NavigationBar<AdminTab>
          tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
        />

      {/* 예약 관리 탭 */}
      {activeTab === 'reservations' && <AdminReservations />}

      {/* 시스템 설정 탭 */}
      {activeTab === 'settings' && <AdminSettings />}

      {/* 팀 관리 탭 */}
      {activeTab === 'teams' && <AdminTeams />}
      
    </PageContainer>
  );
}
