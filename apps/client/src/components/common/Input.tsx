import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import { WarningCircle } from '@phosphor-icons/react';
import { inputClassName } from './inputStyles';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, fullWidth = false, className = '', ...props }, ref) => {
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
            className={`${inputClassName(!!error)} ${icon ? 'pl-10' : ''} ${widthStyles} ${className}`}
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
