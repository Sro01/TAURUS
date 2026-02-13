import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Overlay } from '../common';
import AuthModal from '../domain/auth/AuthModal';
import { authService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';

const NAV_ITEMS = [
  { label: '바로 예약', path: '/instant-reservation' },
  { label: '미리 예약', path: '/pre-reservation' },
  { label: '팀 관리', path: '/teams' }, // /teams 경로는 모달 트리거용
  { label: '관리자', path: '/admin' },
];

export default function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { loginTeam, teamName, teamPassword } = useAuth();

  const handleNavigate = (path: string) => {
    setIsMenuOpen(false);

    if (path === '/teams') {
      // 팀 관리 클릭 시 모달 오픈
      setIsAuthModalOpen(true);
    } else {
      navigate(path);
    }
  };

  const handleAuthSubmit = async (name: string, password: string) => {
    try {
      const { access_token } = await authService.verify({ name, password });
      loginTeam(access_token, name, password);
      setIsAuthModalOpen(false);
      
      // 팀 ID는 토큰에 포함되어 있지만, 클라이언트에서 바로 알 수 없으므로(디코딩 필요)
      // 일단 /teams/me 같은 경로로 가거나, API 호출해서 ID 받은 뒤 이동해야 함.
      // 하지만 여기선 /teams/me 경로를 쓰도록 라우터 설정을 바꾸거나,
      // 임의의 ID 'me'를 쓰고 페이지에서 처리하도록 함.
      navigate('/teams/me'); 
    } catch (error) {
      console.error(error);
      alert('팀 인증에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-bg-main text-text-main">
      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-bg-main/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 z-50">
        <button onClick={() => navigate('/')} className="text-xl font-bold text-primary">
          TAURUS
        </button>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* 햄버거 메뉴 드로어 */}
      {isMenuOpen && (
        <>
          <Overlay onClose={() => setIsMenuOpen(false)} />
          <nav className="fixed top-14 right-0 w-64 bg-bg-card border-l border-white/10 h-[calc(100vh-3.5rem)] z-50 p-4 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary/20 text-primary font-semibold'
                    : 'hover:bg-white/5 text-text-sub'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </>
      )}

      {/* 콘텐츠 영역 */}
      <main className="pt-14 max-w-[600px] mx-auto px-4 pb-20">
        <Outlet />
      </main>

      {/* 팀 인증 모달 */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSubmit={handleAuthSubmit}
        title="팀 관리 접근"
        initialName={teamName || ''}
        initialPassword={teamPassword || ''}
      />
    </div>
  );
}
