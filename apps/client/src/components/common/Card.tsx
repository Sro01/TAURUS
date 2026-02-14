import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  hoverable?: boolean;
}

/** 
 * 공용 카드 컴포넌트 
 * - bg-surface + border-border
 * - hoverable일 경우 border 색상 변경 및 포인터 커서
 */
export default function Card({ children, onClick, className = '', hoverable = false }: CardProps) {
  const base = 'bg-surface rounded-xl border border-border transition-all duration-200';
  const hover = hoverable ? 'hover:border-border-active hover:bg-surface-elevated cursor-pointer group' : '';
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag onClick={onClick} className={`${base} ${hover} ${className} ${onClick ? 'text-left w-full' : ''}`}>
      {children}
    </Tag>
  );
}
