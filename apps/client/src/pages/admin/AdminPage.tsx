import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { adminService } from '../../services';
import { PageContainer, Button } from '../../components/common';
import AuthModal from '../../components/domain/auth/AuthModal';
import { Settings, Users as UsersIcon, Calendar, LogOut } from 'lucide-react';
import AdminReservations from '../../components/domain/admin/AdminReservations';
import AdminSettings from '../../components/domain/admin/AdminSettings';
import AdminTeams from '../../components/domain/admin/AdminTeams';

export default function AdminPage() {
  const navigate = useNavigate();
  const { isAdminAuthenticated, loginAdmin, logoutAdmin } = useAuth();
  
  // 상태
  const [activeTab, setActiveTab] = useState<'reservations' | 'settings' | 'teams'>('reservations');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(!isAdminAuthenticated);
  
  // 핸들러
  const handleAuthSubmit = async (_: string, password: string) => {
    try {
      const { access_token } = await adminService.verify(password);
      loginAdmin(access_token);
      setIsAuthModalOpen(false);
    } catch (error) {
      console.error(error);
      alert('관리자 인증에 실패했습니다.');
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setIsAuthModalOpen(true); 
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="text-center">
          <p className="text-text-sub mb-4">관리자 페이지 접근 권한이 필요합니다.</p>
          <Button onClick={() => navigate('/')}>홈으로 돌아가기</Button>
        </div>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => navigate('/')}
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-bg-card p-4 rounded-2xl border border-white/5">
        <div className="flex gap-1 bg-bg-main p-1 rounded-xl">
          {[
            { id: 'reservations', label: '예약 관리', icon: Calendar },
            { id: 'teams', label: '팀 관리', icon: UsersIcon },
            { id: 'settings', label: '시스템 설정', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-text-sub hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
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
