import { ReactNode } from 'react';

interface ListRowProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export default function ListRow({ left, center, right, onClick, className = '' }: ListRowProps) {
  const Tag = onClick ? 'button' : 'div';
  
  return (
    <Tag 
      onClick={onClick}
      className={`
        w-full flex items-center justify-between p-4 
        bg-surface border-b border-border last:border-0 
        transition-colors duration-200
        ${onClick ? 'cursor-pointer hover:bg-surface-elevated text-left' : ''}
        ${className}
      `}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {left && <div className="flex-shrink-0">{left}</div>}
        {center && <div className="flex-1 min-w-0">{center}</div>}
      </div>
      
      {right && <div className="flex-shrink-0 ml-4">{right}</div>}
    </Tag>
  );
}
