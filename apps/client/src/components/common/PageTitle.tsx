import { ReactNode } from 'react';

interface PageTitleProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function PageTitle({ title, description, action, className = '' }: PageTitleProps) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div>
        <h2 className="text-2xl font-bold text-text-main tracking-tight">{title}</h2>
        {description && <p className="text-sm text-text-sub mt-1">{description}</p>}
      </div>
      {action && <div className="shrink-0 ml-4">{action}</div>}
    </div>
  );
}
