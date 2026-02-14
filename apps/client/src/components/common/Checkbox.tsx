import { InputHTMLAttributes, useEffect, useRef } from 'react';
import { Check, Minus } from '@phosphor-icons/react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  indeterminate?: boolean;
}

export default function Checkbox({ className = '', label, indeterminate, ...props }: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = !!indeterminate;
    }
  }, [indeterminate]);

  return (
    <label className={`inline-flex items-center gap-2 cursor-pointer group ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="checkbox"
          className="peer sr-only"
          {...props}
        />
        <div className="w-4 h-4 border border-border rounded bg-surface transition-all peer-checked:bg-brand-red peer-checked:border-brand-red peer-indeterminate:bg-brand-red peer-indeterminate:border-brand-red peer-focus-visible:ring-2 peer-focus-visible:ring-brand-red/50 group-hover:border-text-sub">
          <Check 
            weight="bold" 
            className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 transition-opacity" 
          />
          <Minus 
            weight="bold" 
            className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-indeterminate:opacity-100 transition-opacity" 
          />
        </div>
      </div>
      {label && (
        <div className="select-none">
          {typeof label === 'string' ? (
            <span className="text-sm text-text-main">{label}</span>
          ) : (
            label
          )}
        </div>
      )}
    </label>
  );
}
