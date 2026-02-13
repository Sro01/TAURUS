import { X } from 'lucide-react';
import { Overlay } from '../../common';
import AuthForm from './AuthForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, password: string) => Promise<void>;
  title?: string;
  isSubmitting?: boolean;
  hideNameField?: boolean;
  submitLabel?: string;
  initialName?: string;
  initialPassword?: string;
}

export default function AuthModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  title = '팀 인증',
  isSubmitting = false,
  hideNameField = false,
  submitLabel,
  initialName = '',
  initialPassword = '',
}: AuthModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <Overlay onClose={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xs bg-bg-card p-6 rounded-2xl border border-white/10 shadow-2xl z-50 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-text-sub" />
          </button>
        </div>

        <AuthForm
          initialName={initialName}
          initialPassword={initialPassword}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          submitLabel={submitLabel}
          hideNameField={hideNameField}
          // AuthModal doesn't strictly need a cancel button inside the form 
          // because it has an X button at top, but maybe consistency?
          // The old one didn't have a cancel button at the bottom.
          // AuthForm adds it if onCancel is provided. I won't provide onCancel here if I don't want the button.
          // But maybe having a cancel button is nice. I'll leave it out to match previous design if possible.
          // AuthForm: `{onCancel && ( ... )}` -> Safe to omit.
        />
      </div>
    </>
  );
}
