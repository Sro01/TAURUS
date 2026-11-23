import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import type { NavItem } from '../../constants/navigation';
import { todayKst } from '../../utils/jam/slots';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  items: NavItem[];
  onNavigate: (path: string) => void;
}

/** 패널: 오른쪽에서 밀려 들어오고 밀려 나감 */
const panelVariants: Variants = {
  hidden: { x: '100%' },
  shown: { x: 0, transition: { type: 'spring', stiffness: 420, damping: 40 } },
  exit: { x: '100%', transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
};

/** 동작 줄이기 설정이면 밀기 없이 나타나고 사라지기만 */
const reducedPanelVariants: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export default function Sidebar({ isOpen, onClose, items, onNavigate }: SidebarProps) {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const today = todayKst();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="sidebar-overlay"
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          />
          <motion.nav
            key="sidebar-panel"
            className="fixed top-14 right-0 w-64 bg-bg-card border-l border-white/10 h-[calc(100vh-3.5rem)] z-50 p-4 flex flex-col gap-1"
            variants={reduceMotion ? reducedPanelVariants : panelVariants}
            initial="hidden"
            animate="shown"
            exit="exit"
          >
            {items.map((item) => (
              <button
                key={item.path}
                onClick={() => onNavigate(item.path)}
                className={`w-full flex items-center gap-2 text-left px-4 py-3 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary/20 text-primary font-semibold'
                    : 'hover:bg-white/5 text-text-sub'
                }`}
              >
                {item.label}
                {item.newUntil && today < item.newUntil && (
                  <Badge className="px-1.5 py-0 text-[10px] leading-4">NEW</Badge>
                )}
              </button>
            ))}
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
}
