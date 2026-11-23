import { ReactNode } from 'react';

interface PageTitleProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /** 제목 아래 구분선 (기본 true) */
  divider?: boolean;
  className?: string;
}

export default function PageTitle({ title, description, action, divider = true, className = '' }: PageTitleProps) {
  return (
    <div className={`flex justify-between ${divider ? 'items-end border-b border-border pb-4 mb-6' : 'items-center mb-4'} ${className}`}>
      <div>
        <h2 className="text-2xl font-bold text-text-main tracking-tight">{title}</h2>
        {description && <p className="text-sm text-text-sub mt-1">{description}</p>}
      </div>
      {action && <div className="shrink-0 ml-4">{action}</div>}
    </div>
  );
}
