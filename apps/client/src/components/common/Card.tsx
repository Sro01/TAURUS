import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  hoverable?: boolean;
}

/** 공용 카드 컴포넌트 — bg-card + border + hover 패턴 재사용 */
export default function Card({ children, onClick, className = '', hoverable = false }: CardProps) {
  const base = 'bg-bg-card rounded-xl border border-white/5 transition-colors';
  const hover = hoverable ? 'hover:border-primary/50 cursor-pointer group' : '';
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag onClick={onClick} className={`${base} ${hover} ${className}`}>
      {children}
    </Tag>
  );
}
