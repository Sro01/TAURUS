import { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function SectionHeader({ title, description, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-end justify-between ${className} border-b border-border pb-4 mb-6`}>
      <div>
        <h3 className="text-xl font-bold text-text-main tracking-tight">{title}</h3>
        {description && <p className="text-sm text-text-sub mt-1">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0 ml-4">{action}</div>}
    </div>
  );
}
