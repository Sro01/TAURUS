import { ReactNode } from 'react';
import { Info, Warning, WarningCircle, CheckCircle } from '@phosphor-icons/react';

type AlertVariant = 'info' | 'warn' | 'error' | 'success';

interface InlineAlertProps {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
  title?: string;
}

const VARIANT_CONFIG = {
  info: {
    icon: Info,
    style: 'bg-status-info/10 border-status-info/20 text-status-info',
  },
  warn: {
    icon: Warning,
    style: 'bg-status-warn/10 border-status-warn/20 text-status-warn',
  },
  error: {
    icon: WarningCircle,
    style: 'bg-status-danger/10 border-status-danger/20 text-status-danger',
  },
  success: {
    icon: CheckCircle,
    style: 'bg-status-success/10 border-status-success/20 text-status-success',
  },
};

export default function InlineAlert({ variant = 'info', children, title, className = '' }: InlineAlertProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <div className={`flex gap-3 p-4 rounded-lg border ${config.style} ${className}`}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" weight="fill" />
      <div className="flex-1 text-sm">
        {title && <strong className="block font-bold mb-1">{title}</strong>}
        <div className="opacity-90 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
