
import { ReactNode } from 'react';

interface ContentAreaProps {
  children: ReactNode;
}

export default function ContentArea({ children }: ContentAreaProps) {
  return (
    <main className="pt-14 max-w-[600px] mx-auto px-4 pb-20 min-h-screen">
      {children}
    </main>
  );
}
