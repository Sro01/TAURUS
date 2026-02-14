
import { useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { ROUTES } from '../../constants/routes';

interface HeaderProps {
  onMenuClick: () => void;
  isMenuOpen: boolean;
  onLogoClick: () => void;
}

export default function Header({ onMenuClick, isMenuOpen, onLogoClick }: HeaderProps) {
  const location = useLocation();
  const isHome = location.pathname === ROUTES.HOME;

  return (
    <header className={`fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-50 ${
      isHome 
        ? 'bg-transparent border-none' 
        : 'bg-bg-main/90 backdrop-blur-md border-b border-white/10'
    }`}>
      <button onClick={onLogoClick} className="text-primary flex flex-col items-center">
        <img src="/images/taurus-logo.png" alt="taurus-logo" className="w-11" />
        {/* <span className="text-white text-[7px] font-bold">TAURUS</span> */}
      </button>
      <button
        onClick={onMenuClick}
        className="p-2 hover:bg-white/10 rounded-full transition-colors"
      >
        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>
    </header>
  );
}
