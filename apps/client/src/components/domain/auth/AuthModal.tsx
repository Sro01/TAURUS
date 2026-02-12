import { useState } from 'react';
import { X } from 'lucide-react';
import { Button, Overlay } from '../../common';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, password: string) => Promise<void>;
  title?: string;
  isSubmitting?: boolean;
  hideNameField?: boolean;
}

export default function AuthModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  title = '팀 인증',
  isSubmitting = false,
  hideNameField = false,
  submitLabel
}: AuthModalProps & { submitLabel?: string }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('AuthModal handleSubmit called', { name, password });
    if ((!hideNameField && !name.trim()) || !password.trim()) return;
    await onSubmit(name, password);
  };

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

        <form onSubmit={handleSubmit} className="space-y-4">
          {!hideNameField && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-sub ml-1">팀 이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-bg-main border border-white/10 rounded-lg px-4 py-3 text-text-main focus:border-primary focus:outline-none transition-colors"
                placeholder="팀 이름을 입력하세요"
                autoFocus
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-text-sub ml-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg-main border border-white/10 rounded-lg px-4 py-3 text-text-main focus:border-primary focus:outline-none transition-colors"
              placeholder="비밀번호를 입력하세요"
              autoFocus={hideNameField}
            />
          </div>

          <Button 
            type="submit" 
            fullWidth 
            className="mt-2"
            disabled={isSubmitting || (!hideNameField && !name) || !password}
          >
            {isSubmitting ? '처리 중...' : (submitLabel || '확인')}
          </Button>
        </form>
      </div>
    </>
  );
}
