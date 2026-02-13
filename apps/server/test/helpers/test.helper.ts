import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TEST_PREFIX } from '../setup-e2e';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const KST = 'Asia/Seoul';

/**
 * 팀 인증 후 토큰 반환
 */
export async function getTeamToken(
    app: INestApplication,
    name: string,
    password: string,
    autoRegister = false,
): Promise<string> {
    const res = await request(app.getHttpServer())
        .post('/auth/verify')
        .send({ name, password, autoRegister });
    return res.body.data?.access_token ?? res.body.access_token;
}

/**
 * 관리자 인증 후 토큰 반환
 */
export async function getAdminToken(app: INestApplication): Promise<string> {
    const res = await request(app.getHttpServer())
        .post('/admin/verify')
        .send({ password: process.env.ADMIN_PASSWORD || 'super-admin-key' });
    return res.body.data?.access_token ?? res.body.access_token;
}

/**
 * 테스트용 팀 생성 후 토큰 반환
 */
export async function createTestTeam(
    app: INestApplication,
    suffix: string,
    password = '1234',
): Promise<{ name: string; token: string; id: string }> {
    const name = `${TEST_PREFIX}${suffix}`;
    const token = await getTeamToken(app, name, password, true);

    // 토큰에서 ID 추출 (base64 decode)
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const id = payload.sub;

    return { name, token, id };
}

/**
 * OPEN 주차의 유효한 미래 슬롯 시간 생성 (KST 기준)
 * - 내일 이후 정각 시간 반환
 */
export function getFutureSlotTime(daysFromNow = 1, hour = 10): string {
    return dayjs()
        .tz(KST)
        .add(daysFromNow, 'day')
        .hour(hour)
        .minute(0)
        .second(0)
        .millisecond(0)
        .format();
}

/**
 * 테스트 로그 출력
 */
export function logTest(phase: string, name: string, status: 'PASS' | 'FAIL', detail?: string) {
    const icon = status === 'PASS' ? '✅' : '❌';
    console.log(`  ${icon} [${phase}] ${name}${detail ? ` — ${detail}` : ''}`);
}
