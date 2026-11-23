import { ROUTES } from './routes';

export interface NavItem {
  label: string;
  path: string;
}

/** 사이드바 메뉴 (PublicLayout, ProtectedLayout 공용) */
export const NAV_ITEMS: NavItem[] = [
  { label: '바로 예약', path: ROUTES.INSTANT_RESERVATION },
  { label: '미리 예약', path: ROUTES.PRE_RESERVATION },
  { label: '합주 시간 조율', path: ROUTES.JAM_CREATE },
  { label: '팀 관리', path: ROUTES.TEAMS_ME },
  { label: '관리자', path: ROUTES.ADMIN },
];
