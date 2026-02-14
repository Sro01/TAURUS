import { InputHTMLAttributes } from 'react';
import { Check } from '@phosphor-icons/react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export default function Checkbox({ className = '', label, ...props }: CheckboxProps) {
  return (
    <label className={`inline-flex items-center gap-2 cursor-pointer group ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <div className="relative flex items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          {...props}
        />
        <div className="w-5 h-5 border border-border rounded bg-surface transition-all peer-checked:bg-brand-red peer-checked:border-brand-red peer-focus-visible:ring-2 peer-focus-visible:ring-brand-red/50 group-hover:border-text-sub">
          <Check 
            weight="bold" 
            className="w-3.5 h-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 transition-opacity" 
          />
        </div>
      </div>
      {label && <span className="text-sm text-text-main select-none">{label}</span>}
    </label>
  );
}
