import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'outline' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed',
  outline: 'border border-primary text-primary hover:bg-primary/10',
  ghost: 'text-text-sub hover:bg-white/5',
};

export default function Button({ variant = 'primary', fullWidth = false, className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`px-4 py-2 rounded-lg transition-colors font-medium ${VARIANT_STYLES[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
