
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import ContentArea from './ContentArea';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';
import { ROUTES } from '../../constants/routes';

interface ProtectedLayoutProps {
  allowedRoles: ('ADMIN' | 'TEAM')[];
}

export default function ProtectedLayout({ allowedRoles }: ProtectedLayoutProps) {
  const { isTeamAuthenticated, isAdminAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  // 현재 사용자에게 필요한 권한이 있는지 확인
  const requiredRole = allowedRoles.includes('ADMIN') ? 'ADMIN' : 'TEAM';
  const hasAccess = (() => {
    if (requiredRole === 'ADMIN' && isAdminAuthenticated) return true;
    if (requiredRole === 'TEAM' && isTeamAuthenticated) return true;
    return false;
  })();

  // 공통 레이아웃 렌더링 함수
  const renderLayout = (content: React.ReactNode) => (
    <div className="min-h-screen bg-bg-main text-text-main">
      <Header 
        isMenuOpen={isMenuOpen} 
        onMenuClick={() => setIsMenuOpen(!isMenuOpen)} 
        onLogoClick={() => window.location.href = ROUTES.HOME} 
      />

      <Sidebar 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        items={[
          { label: '바로 예약', path: ROUTES.INSTANT_RESERVATION },
          { label: '미리 예약', path: ROUTES.PRE_RESERVATION },
          { label: '팀 관리', path: ROUTES.TEAMS_ME },
          { label: '관리자', path: ROUTES.ADMIN },
        ]}
        onNavigate={(path) => {
            setIsMenuOpen(false);
            window.location.href = path; 
        }}
      />

      <ContentArea>
        {content}
      </ContentArea>
    </div>
  );

  // 권한이 없으면 로그인 페이지로 리다이렉트 (state에 현재 위치 저장)
  if (!hasAccess) {
    return <Navigate to={`${ROUTES.LOGIN}?role=${requiredRole}`} state={{ from: location }} replace />;
  }

  // 권한 있으면 Outlet 렌더링
  return renderLayout(<Outlet />);
}
