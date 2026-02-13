
import { RouteObject } from 'react-router-dom';
import PublicLayout from './components/layout/PublicLayout';
import ProtectedLayout from './components/layout/ProtectedLayout';
import HomePage from './pages/home/HomePage';
import InstantReservationPage from './pages/instant-reservation/InstantReservationPage';
import PreReservationPage from './pages/pre-reservation/PreReservationPage';
import TeamDetailPage from './pages/team/TeamDetailPage';
import AdminPage from './pages/admin/AdminPage';
import NotFoundPage from './pages/not-found/NotFoundPage';
import LoginPage from './pages/auth/LoginPage';
import { ROUTES } from './constants/routes';

// Public Routes: 누구나 접근 가능
const publicRoutes: RouteObject = {
    element: <PublicLayout />,
    children: [
      {
        path: ROUTES.HOME,
        element: <HomePage />,
      },
      {
        path: ROUTES.INSTANT_RESERVATION,
        element: <InstantReservationPage />,
      },
      {
        path: ROUTES.PRE_RESERVATION,
        element: <PreReservationPage />,
      },
      {
        path: ROUTES.LOGIN,
        element: <LoginPage />,
      },
      {
        path: ROUTES.NOT_FOUND,
        element: <NotFoundPage />,
      },
    ],
};

// Protected Routes: Admin
const adminRoutes: RouteObject = {
    path: ROUTES.ADMIN, // 'admin'
    element: <ProtectedLayout allowedRoles={['ADMIN']} />,
    children: [
        {
        index: true,
        element: <AdminPage />,
        },
    ],
};

// Protected Routes: Team
const teamRoutes: RouteObject = {
    path: ROUTES.TEAMS_ME, // 'teams/me'
    element: <ProtectedLayout allowedRoles={['TEAM']} />,
    children: [
        {
        index: true,
        element: <TeamDetailPage />,
        },
    ],
};

// 전체 라우트 설정
export const routes: RouteObject[] = [
  publicRoutes,
  adminRoutes,
  teamRoutes,
];
