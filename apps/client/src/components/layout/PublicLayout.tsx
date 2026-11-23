import { useState } from 'react';

import { Outlet, useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import ContentArea from './ContentArea';


import { ROUTES } from '../../constants/routes';
import { NAV_ITEMS } from '../../constants/navigation';

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
