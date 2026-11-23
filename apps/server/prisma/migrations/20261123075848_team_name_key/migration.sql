-- 팀 이름 비교용 칸 "nameKey" 추가 (스펙 4.3 1번)
-- Prisma가 만든 SQL(ADD COLUMN ... NOT NULL + unique 한 번)은 기존 행이 있으면 실패해서 순서대로 손으로 바꿔 씀.
-- 운영 DB에서 되돌릴 수 없음. 배포 직전 비교용 이름 중복·빈 값을 다시 조회할 것.

-- 1. 지울 팀 7개 삭제 (이름 정확히 일치만). 예약은 reservations_teamId_fkey ON DELETE CASCADE로 같이 지워짐
DELETE FROM "teams"
WHERE "name" IN (
    '안티ㅡ프',
    'ㅇㅌㅍㄹㅈ',
    '청색동경.',
    '최유라와 노인들',
    'Fightman',
    'Godknows',
    'TeamPurple'
);

-- 2. "nameKey"를 null 허용으로 추가하고 남은 팀 전부 채움
--    normalizeName(src/common/utils/name.ts)과 같은 규칙: NFC → 숫자·영문·한글 완성형만 남김 → 소문자
--    lower()는 정렬 규칙(collation)을 따라 바뀜(예: tr-TR에서 I → ı) → COLLATE "C"로 고정해 영문 A–Z만 a–z로 바꿈
ALTER TABLE "teams" ADD COLUMN "nameKey" TEXT;

UPDATE "teams"
SET "nameKey" = lower((regexp_replace(normalize("name", NFC), '[^0-9A-Za-z가-힣]', '', 'g')) COLLATE "C");

-- 2-1. 비교용 이름이 빈 팀(특수문자·이모지 등만 있는 이름)이 있으면 중단. 이 마이그레이션 전체(1번 삭제 포함)가 롤백됨
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "teams" WHERE "nameKey" = '') THEN
        RAISE EXCEPTION 'team_name_key: 비교용 이름이 빈 팀이 있습니다 (한글·영문·숫자가 없는 팀 이름). 해당 팀을 정리한 뒤 다시 배포하세요: %',
            (SELECT string_agg("name", ', ') FROM "teams" WHERE "nameKey" = '');
    END IF;
END $$;

-- 3. null 금지 + 겹침 제약
ALTER TABLE "teams" ALTER COLUMN "nameKey" SET NOT NULL;

CREATE UNIQUE INDEX "teams_nameKey_key" ON "teams"("nameKey");
