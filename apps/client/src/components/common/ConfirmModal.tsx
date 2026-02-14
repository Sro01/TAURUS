import { ReactNode } from 'react';
import Modal from './Modal';
import Button from './Button';
import { WarningCircle } from '@phosphor-icons/react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'brand';
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = '확인',
  cancelText = '취소',
  variant = 'brand',
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col gap-6">
        <div className="flex gap-4">
          {variant === 'danger' && (
            <div className="w-12 h-12 rounded-full bg-status-danger/10 flex items-center justify-center flex-shrink-0">
              <WarningCircle className="w-6 h-6 text-status-danger" weight="fill" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-text-sub leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button 
            variant={variant} 
            onClick={onConfirm} 
            disabled={isLoading}
          >
            {isLoading ? '처리 중...' : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
