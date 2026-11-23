
import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

interface ContentAreaProps {
  children: ReactNode;
}

export default function ContentArea({ children }: ContentAreaProps) {
  const location = useLocation();
  const isHome = location.pathname === ROUTES.HOME;
  // 관리자 화면은 넓은 화면에서 두 단(목록 + 상세)으로 보여서 폭을 넓혀요
  const isAdmin = location.pathname.startsWith(ROUTES.ADMIN);

  return (
    <main className={`min-h-screen ${
      isHome 
        ? 'w-full' 
        : `pt-14 max-w-[600px] mx-auto px-4 ${isAdmin ? 'lg:max-w-[1100px] lg:px-8' : ''}`
    }`}>
      {children}
    </main>
  );
}
