
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
  isMenuOpen: boolean;
  onLogoClick: () => void;
}

export default function Header({ onMenuClick, isMenuOpen, onLogoClick }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-bg-main/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 z-50">
      <button onClick={onLogoClick} className="text-xl font-bold text-primary">
        TAURUS
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
