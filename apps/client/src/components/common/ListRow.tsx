import { ReactNode } from 'react';

interface ListRowProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  className?: string;
  /** 행 내부 세로 정렬 (기본: 'center') */
  align?: 'center' | 'start';
}

export default function ListRow({ left, center, right, onClick, className = '', align = 'center' }: ListRowProps) {
  const Tag = onClick ? 'button' : 'div';
  const alignClass = align === 'start' ? 'items-start' : 'items-center';
  
  return (
    <Tag 
      onClick={onClick}
      className={`
        w-full flex ${alignClass} justify-between p-4 
        border-b border-border last:border-0 
        transition-colors duration-200
        ${onClick ? 'cursor-pointer hover:bg-surface-elevated text-left' : ''}
        ${className}
      `}
    >
      <div className={`flex ${alignClass} gap-4 flex-1 min-w-0`}>
        {left && <div className="flex-shrink-0">{left}</div>}
        {center && <div className="flex-1 min-w-0">{center}</div>}
      </div>
      
      {right && <div className="flex-shrink-0 ml-4">{right}</div>}
    </Tag>
  );
}
