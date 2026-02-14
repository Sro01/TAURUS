import { ReactNode } from 'react';

interface SettingsRowProps {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export default function SettingsRow({ label, description, children, className = '' }: SettingsRowProps) {
  return (
    <div className={`flex flex-col md:flex-row md:items-center justify-between py-6 border-b border-border last:border-0 group ${className}`}>
      <div className="mb-4 md:mb-0 pr-8">
        <h4 className="text-base font-medium text-text-main">{label}</h4>
        {description && <p className="text-sm text-text-sub mt-1 max-w-md break-keep">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}
