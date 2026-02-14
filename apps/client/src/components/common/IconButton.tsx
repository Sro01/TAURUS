import { ButtonHTMLAttributes, ReactNode } from 'react';

type IconButtonVariant = 'ghost' | 'outline' | 'filled';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

const VARIANT_STYLES: Record<IconButtonVariant, string> = {
  ghost: 'text-text-sub hover:text-text-main hover:bg-white/5 bg-transparent border border-transparent',
  outline: 'text-text-main border border-border hover:border-text-sub bg-transparent',
  filled: 'text-white bg-surface-elevated hover:bg-surface-elevated/80 border border-transparent',
};

const SIZE_STYLES: Record<IconButtonSize, string> = {
  sm: 'p-1.5 rounded-md text-sm',
  md: 'p-2 rounded-lg text-base',
  lg: 'p-3 rounded-xl text-lg',
};

export default function IconButton({ 
  children, 
  variant = 'ghost', 
  size = 'md', 
  className = '', 
  ...props 
}: IconButtonProps) {
  return (
    <button
      className={`flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
