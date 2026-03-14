import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'brand' | 'blue' | 'outline' | 'outline_blue' | 'ghost' | 'danger' | 'glow';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  // Legacy primary mapped to brand style
  primary: 'bg-brand-red text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed',
  brand: 'bg-brand-red text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent',
  blue: 'bg-blue-500 text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent',
  outline: 'border border-border text-text-main hover:border-brand-red hover:text-brand-red bg-transparent disabled:opacity-50 disabled:cursor-not-allowed',
  outline_blue: 'border border-border text-text-main hover:border-blue-500 hover:text-blue-500 bg-transparent disabled:opacity-50 disabled:cursor-not-allowed',
  ghost: 'text-text-sub hover:bg-white/5 hover:text-text-main disabled:opacity-50 disabled:cursor-not-allowed bg-transparent border border-transparent',
  danger: 'bg-status-danger text-white hover:bg-status-danger/90 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent',
  // Special variant for HomePage
  glow: 'bg-transparent border border-white/30 text-white tracking-[0.2em] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-white hover:text-black hover:border-white hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-wait',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs font-medium',
  md: 'px-4 py-2 text-sm font-medium',
  lg: 'px-6 py-3 text-base font-bold',
};

export default function Button({ 
  variant = 'brand', 
  size = 'md',
  fullWidth = false, 
  className = '', 
  children, 
  ...props 
}: ButtonProps) {
  return (
    <button
      className={`rounded-lg transition-colors duration-200 cursor-pointer flex items-center justify-center ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
