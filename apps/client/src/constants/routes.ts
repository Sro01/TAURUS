
export const ROUTES = {
    HOME: '/',
    INSTANT_RESERVATION: '/instant-reservation',
    PRE_RESERVATION: '/pre-reservation',
    LOGIN: '/login',
    ADMIN: '/admin',
    TEAMS_ME: '/teams/me',
    JAM_CREATE: '/jam',
    JAM_ROOM: '/jam/:slug',
    DESIGN_TEST: '/design-test', // Temporary for verification
    NOT_FOUND: '*',
} as const;

/** 합주 방 주소: /jam/<slug> */
export const jamRoomPath = (slug: string) => `/jam/${encodeURIComponent(slug)}`;
