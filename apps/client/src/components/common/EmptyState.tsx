import { ReactNode } from 'react';

interface EmptyStateProps {
  message: string;
  action?: ReactNode;
}

/** 공용 빈 상태 메시지 — 데이터가 없을 때 표시 */
export default function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <p className="text-text-sub">{message}</p>
      {action}
    </div>
  );
}
