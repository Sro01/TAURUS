import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../src/prisma/prisma.service';
import { normalizeName } from '../src/common/utils/name';

// 비교표: 마이그레이션 team_name_key의 SQL과 normalizeName이 같은 비교용 이름을 만드는지
// 실제 Postgres(DATABASE_URL)에서 확인한다 (스펙 4.3, 6.2). DB에 쓰지 않는다.
const TABLE: [string, string][] = [
  ['FIGHTMAN', 'fightman'],
  ['Fightman', 'fightman'],
  ['godknows', 'godknows'],
  ['Team Purple', 'teampurple'],
  ['최유라와 노인들', '최유라와노인들'],
  ['청색동경.', '청색동경'],
  ['안티ㅡ프', '안티프'],
  ['ㅇㅌㅍㄹㅈ', ''],
  ['  ABC def 123  ', 'abcdef123'],
  ['__test_auth_team', 'testauthteam'],
  ['오아시스 Band!', '오아시스band'],
  ['한글', '한글'], // 첫가끝(NFD) → NFC 완성형
  ['ÀBC', 'bc'], // 영문 외 라틴 글자는 지움
  ['İstanbul', 'stanbul'], // 점 있는 대문자 I는 영문이 아님
  ['K9', 'k9'], // 켈빈 기호는 NFC에서 영문 K로 바뀜
  ['ＡＢＣ', ''], // 전각 영문은 영문이 아님
  ['🎸밴드', '밴드'],
  ['탭\t줄\n바꿈', '탭줄바꿈'],
  ['!!!', ''],
];

const MIGRATION = join(
  __dirname,
  '../prisma/migrations/20261123075848_team_name_key/migration.sql',
);

// 마이그레이션 파일의 UPDATE 식을 그대로 꺼내 쓴다
function nameKeySqlFromMigration(): string {
  const sql = readFileSync(MIGRATION, 'utf8');
  const m = sql.match(/SET "nameKey" = (.+);/);
  if (!m) throw new Error('migration.sql에서 nameKey 식을 찾지 못함');
  return m[1].replace(/"name"/g, 'u.x');
}

describe('팀 비교용 이름 SQL ↔ normalizeName (E2E, 실제 DB)', () => {
  const prisma = new PrismaService();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('비교표의 모든 이름이 SQL·normalizeName·기대값 셋 다 같음', async () => {
    const expr = nameKeySqlFromMigration();
    const rows = await prisma.$queryRawUnsafe<{ input: string; key: string }[]>(
      `SELECT u.x AS input, ${expr} AS key
       FROM unnest($1::text[]) WITH ORDINALITY AS u(x, i)
       ORDER BY u.i`,
      TABLE.map(([input]) => input),
    );

    const got = rows.map((r) => [r.input, r.key, normalizeName(r.input)]);
    const want = TABLE.map(([input, key]) => [input, key, key]);
    expect(got).toEqual(want);
  });
});
