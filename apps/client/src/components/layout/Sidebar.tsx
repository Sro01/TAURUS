
import { Overlay } from '../common';
import { useLocation } from 'react-router-dom';

interface NavItem {
  label: string;
  path: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  items: NavItem[];
  onNavigate: (path: string) => void;
}

export default function Sidebar({ isOpen, onClose, items, onNavigate }: SidebarProps) {
  const location = useLocation();

  if (!isOpen) return null;

  return (
    <>
      <Overlay onClose={onClose} />
      <nav className="fixed top-14 right-0 w-64 bg-bg-card border-l border-white/10 h-[calc(100vh-3.5rem)] z-50 p-4 flex flex-col gap-1 animate-in slide-in-from-right duration-200">
        {items.map((item) => (
          <button
            key={item.path}
            onClick={() => onNavigate(item.path)}
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
  );
}
