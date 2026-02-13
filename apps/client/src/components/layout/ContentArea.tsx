
import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

interface ContentAreaProps {
  children: ReactNode;
}

export default function ContentArea({ children }: ContentAreaProps) {
  const location = useLocation();
  const isHome = location.pathname === ROUTES.HOME;

  return (
    <main className={`min-h-screen ${
      isHome 
        ? 'w-full' 
        : 'pt-14 max-w-[600px] mx-auto px-4 pb-20'
    }`}>
      {children}
    </main>
  );
}
