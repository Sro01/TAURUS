import { SelectHTMLAttributes } from 'react';
import { CaretDown } from '@phosphor-icons/react';

interface Option {
  value: string | number;
  label: string;
}

interface DropdownProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: Option[];
  value: string | number;
  onChange: (value: string) => void;
  className?: string;
  fullWidth?: boolean;
}

export function Dropdown({
  label,
  options,
  value,
  onChange,
  className = '',
  fullWidth = true,
  ...props
}: DropdownProps) {
  return (
    <div className={`${fullWidth ? 'w-full' : 'w-auto'} space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-text-sub ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`
            appearance-none
            ${fullWidth ? 'w-full' : 'w-auto'}
            bg-surface border border-border rounded-xl px-4 py-2.5
            text-text-main text-sm font-medium
            outline-none transition-all
            hover:border-border-active
            focus:border-brand-red/50 focus:ring-2 focus:ring-brand-red/10
            cursor-pointer
          `}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-sub group-hover:text-text-main transition-colors">
          <CaretDown weight="bold" size={16} />
        </div>
      </div>
    </div>
  );
}
