import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import Overlay from './Overlay';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-md'
}: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Overlay onClose={onClose} />
      <div className={`relative w-full ${maxWidth} bg-bg-card rounded-2xl border border-white/10 shadow-2xl p-6 z-50 animate-in fade-in zoom-in-95 duration-200`}>
        <div className="flex justify-between items-center mb-6">
          {title && <h3 className="text-xl font-bold text-white">{title}</h3>}
          <button
            onClick={onClose}
            className="p-1 text-text-sub hover:text-white hover:bg-white/5 bg-white/5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="text-text-main">
          {children}
        </div>
        {footer && (
          <div className="mt-8 flex gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
