/**
 * 팀 응답 DTO
 */
export interface Team {
    id: string;
    name: string;
    role: string;
    createdAt: string;
}

/**
 * 팀 이름 변경 DTO
 */
export interface UpdateNameDto {
    name: string;
}

/**
 * 비밀번호 변경 DTO
 */
export interface UpdatePasswordDto {
    currentPassword: string;
    password: string;
}

/**
 * 팀 이름 검색 항목
 */
export interface TeamSearchItem {
    id: string;
    name: string;
}

/**
 * 팀 이름 검색 응답 (GET /teams/search)
 */
export interface TeamSearchResponse {
    problem: 'LOOSE_JAMO' | 'EMPTY_KEY' | null;
    exact: TeamSearchItem | null;
    matches: TeamSearchItem[];
}
