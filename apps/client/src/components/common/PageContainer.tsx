import { ReactNode } from 'react';

interface PageContainerProps {
  title: string;
  children: ReactNode;
  className?: string;
}

/** 공용 페이지 컨테이너 — 상단 타이틀 + 본문 영역 */
export default function PageContainer({ title, children, className = '' }: PageContainerProps) {
  return (
    <div className={`py-6 ${className}`}>
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      {children}
    </div>
  );
}
