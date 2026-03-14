import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

/** 공용 페이지 컨테이너 — 본문 영역 래퍼 */
export default function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`py-6 ${className}`}>
      {children}
    </div>
  );
}
