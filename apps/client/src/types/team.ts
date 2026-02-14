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
