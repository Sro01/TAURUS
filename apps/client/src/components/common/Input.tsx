import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import { WarningCircle } from '@phosphor-icons/react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, fullWidth = false, className = '', ...props }, ref) => {
    const baseStyles = "bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none transition-all placeholder:text-text-sub/50 disabled:opacity-50 disabled:cursor-not-allowed";
    const focusStyles = "focus:border-primary focus:ring-1 focus:ring-primary/50";
    const errorStyles = error ? "border-status-danger/50 focus:border-status-danger focus:ring-status-danger/50" : focusStyles;
    const widthStyles = fullWidth ? "" : "w-full";
    
    return (
      <div className={`${widthStyles} text-left`}>
        {label && (
          <label className="block text-sm font-medium text-text-sub mb-1.5 ml-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`${baseStyles} ${errorStyles} ${icon ? 'pl-10' : ''} ${widthStyles} ${className}`}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 ml-1 text-xs text-status-danger flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
            <WarningCircle size={14} weight="fill" className="shrink-0" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
