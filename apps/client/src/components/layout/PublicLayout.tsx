import { useState } from 'react';

import { Outlet, useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import ContentArea from './ContentArea';


import { ROUTES } from '../../constants/routes';

const NAV_ITEMS = [
  { label: '바로 예약', path: ROUTES.INSTANT_RESERVATION },
  { label: '미리 예약', path: ROUTES.PRE_RESERVATION },
  { label: '팀 관리', path: ROUTES.TEAMS_ME },
  { label: '관리자', path: ROUTES.ADMIN },
];

export default function PublicLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
    const handleNavigate = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-bg-main text-text-main">
      <Header 
        isMenuOpen={isMenuOpen} 
        onMenuClick={() => setIsMenuOpen(!isMenuOpen)} 
        onLogoClick={() => navigate(ROUTES.HOME)} 
      />

      <Sidebar 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        items={NAV_ITEMS}
        onNavigate={handleNavigate}
      />

      <ContentArea>
        <Outlet />
      </ContentArea>
    </div>
  );
}
