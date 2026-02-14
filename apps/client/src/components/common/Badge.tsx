import { HTMLAttributes, ReactNode } from 'react';

type BadgeVariant = 'default' | 'brand' | 'success' | 'warn' | 'danger' | 'outline';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  default: 'bg-surface-elevated text-text-sub border border-border',
  brand: 'bg-brand-red/10 text-brand-red border border-brand-red/20',
  success: 'bg-status-success/10 text-status-success border border-status-success/20',
  warn: 'bg-status-warn/10 text-status-warn border border-status-warn/20',
  danger: 'bg-status-danger/10 text-status-danger border border-status-danger/20',
  outline: 'bg-transparent text-text-sub border border-border',
};

export default function Badge({ 
  variant = 'default', 
  className = '', 
  children, 
  ...props 
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${VARIANT_STYLES[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
