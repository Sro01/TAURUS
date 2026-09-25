# TAURUS v2 설계 문서

- 작성일: 2026-09-25
- 상태: 설계 확정 (구현 전)
- 범위: 합주실 예약 시스템을 Next.js로 새로 만들고, 팀·공연·알림·구인 게시판 기능을 추가

---

## 1. 배경과 목표

### 1.1 왜 다시 만드는가

1. **비용**: Railway(서버) 비용이 매월 약 5달러 나온다. 프로젝트를 유지하려면 **운영 비용이 0원**이어야 한다.
2. **중복 팀 문제**: 지금은 "팀 = 계정"(팀명 + 비밀번호) 구조이고, 예약할 때 없는 팀명이면 자동으로 팀이 생성된다(`autoRegister: true`). 실제로는 같은 팀인데 예약할 때마다 새 팀이 생겨서 팀 현황을 파악할 수 없다. 원인은 다음과 같다.
   - 비밀번호를 잊어버림
   - 팀원마다 각자 따로 팀을 만듦
   - 팀명 표기가 매번 다름 (예: "블루스" / "Blues팀")
   - 새로 만드는 게 더 편함
3. **기능 확장**: 팀 등록(곡, 팀원), 알림, 공연 관리 대시보드, 구인 게시판을 추가해야 한다.
4. **기존 코드 품질**: 2026-09-25 진단 결과 재사용할 수 있는 코드는 약 20%다. 신원 모델이 바뀌면 인증, 팀, 예약 소유권, 클라이언트 인증을 전부 고쳐야 하므로 새로 만드는 쪽이 싸다.

### 1.2 반드시 지켜야 할 조건

- 운영 비용 0원
- **로그인을 필수로 만들지 않는다.** 팀명 + 비밀번호로 바로 예약하는 지금의 간편한 흐름을 유지한다.
- **일요일 00:00 KST 정각에 주차를 전환한다.** 이 시각부터 선착순 예약이 열린다.
- 기존 예약(바로 예약, 미리 예약, 관리자 예약), 팀, 주차 데이터를 **전부 이관**한다.
- 예약표는 다른 사용자의 변경이 **1초 이내**에 반영되어야 한다.

---

## 2. 인프라 (0원 구성)

| 역할 | 서비스 | 비고 |
|---|---|---|
| 앱 (화면 + API) | **Next.js (App Router) on Vercel Hobby** | Function 리전은 서울(`icn1`). Hobby 플랜은 비상업 용도만 허용한다 |
| DB | **Supabase Free (Postgres, 서울 `ap-northeast-2`)** | 500MB |
| 인증 | **Supabase Auth – Kakao provider** | 이메일은 받지 않는다("Allow users without an email"). 이메일을 받으려면 비즈 앱 전환이 필요하기 때문 |
| 실시간 | **Supabase Realtime (Broadcast)** | 동시 접속 200, 월 200만 메시지 |
| 알림 | **Web Push (PWA, VAPID)** | 무료. 카카오톡 알림은 쓰지 않는다 (§10.1 참고) |
| 주기 작업 | **cron-job.org** (무료, 최소 1분 간격) | 리마인더 발송, 유지 신호, 전환 보조 |
| 전환 보조 | **pg_cron (Supabase Cron)** | 00:00에 한 번 더 전환 여부를 확인하는 안전망 |
| 백업 | **GitHub Actions** | 매일 `pg_dump`를 비공개 저장소나 Artifact에 보관. Supabase Free에는 자동 백업이 없다 |

### 2.1 Supabase 일시정지 대비

Supabase Free 프로젝트는 **7일 동안 DB 활동이 부족하면 일시정지**된다. 공식 문서 기준은 "sufficient user database activity"이고, 정확한 수치는 공개되어 있지 않다. 프로젝트 내부의 pg_cron 활동은 활동으로 인정되지 않는다는 커뮤니티 보고가 있다.

- cron-job.org가 **매일** Next.js의 `/api/cron/keepalive`를 호출하고, 이 엔드포인트가 DB에 실제 쿼리를 보낸다.
- GitHub Actions에 같은 호출을 예비로 하나 더 건다.
- 일시정지 경고 메일이 오는지 확인한다. 경고는 정지 약 1주 전에 온다.
- 일시정지되더라도 1년 안에는 대시보드에서 복원할 수 있다.

### 2.2 DB 연결

- Prisma는 **Supavisor 트랜잭션 모드**(포트 6543, `pgbouncer=true`, 풀 크기 1)로 연결한다.
- 마이그레이션은 직접 연결(session) 문자열로 실행한다.

---

## 3. 아키텍처

```
브라우저 ──(Server Action / Route Handler)──▶ Next.js on Vercel ──(Prisma)──▶ Supabase Postgres
   ▲                                                                  │
   └───────── Supabase Realtime Broadcast ◀── DB 트리거 ◀─────────────┘
   ▲
   └───────── Web Push ◀── Next.js (web-push, VAPID) ◀── cron-job.org (5분 간격)
```

- **DB 읽기와 쓰기는 모두 Next.js 서버를 거친다** (Prisma). 브라우저는 Supabase 테이블을 직접 읽지 않고, Realtime 채널만 구독한다. 그래서 RLS는 "anon/authenticated 직접 접근 금지" 수준으로 단순하게 유지한다.
- 이렇게 하는 이유: 게스트 비밀번호 인증, 팀별 쿠키, 선착순 트랜잭션처럼 RLS로 표현하기 어려운 규칙이 많다.
- 인증은 두 경로가 함께 존재한다.
  - **사용자 세션**: Supabase Auth(카카오)
  - **팀 게스트 인증**: 팀 비밀번호 검증에 성공하면 팀별로 서명된 httpOnly 쿠키를 발급한다 (30일, `tokenVersion` 포함)

---

## 4. 도메인 모델

Prisma 스키마 초안이다. 필드명은 구현할 때 확정한다.

```prisma
enum Role { USER ADMIN }
enum Session { VOCAL GUITAR BASS DRUM KEYBOARD ETC }

model User {                      // Supabase auth.users 와 1:1
  id          String   @id        // = auth.users.id
  kakaoId     String   @unique
  name        String
  studentId   String?             // 본인·관리자만 전체 공개, 그 외 마스킹 (202015***)
  sessions    Session[]
  generation  Int?                // 기수
  role        Role     @default(USER)
  privacyAgreedAt DateTime?
}

model Team {
  id             String    @id @default(uuid())   // 기존 팀 UUID 보존
  name           String                           // 삭제되지 않은 팀끼리는 unique (부분 unique index)
  nameNormalized String                           // 유사 이름 경고용 (공백·대소문자·기호 제거)
  description    String?
  passwordHash   String                           // 기존 bcrypt 해시 그대로. 검증은 bcryptjs
  tokenVersion   Int       @default(0)            // 비밀번호 변경 시 +1 → 게스트 쿠키 무효화
  deletedAt      DateTime?                        // 소프트 삭제
  mergedIntoId   String?                          // 관리자 병합 이력
}

model TeamMember {                // 팀 등록 모달의 "세션 | 이름" 행
  id          String  @id @default(uuid())
  teamId      String
  session     Session
  displayName String
  userId      String?             // 카카오 사용자가 "이 팀원 중 누구인가요?"에서 고르면 연결
  sortOrder   Int
  @@unique([teamId, userId])
}

model TeamInvite { id, teamId, token @unique, createdAt, revokedAt? }   // 팀원 누구나 재발급 가능

model Song {
  id               String @id @default(uuid())
  title            String            // 한글 표기 우선
  artist           String
  titleNormalized  String
  artistNormalized String
  source           String            // LOCAL | MUSICBRAINZ | ITUNES
  externalId       String?
  @@unique([titleNormalized, artistNormalized])
}
model TeamSong { teamId, songId, @@id([teamId, songId]) }

model Week { /* 기존 구조 유지. id·year·weekNumber 보존 */ }

model Reservation {
  // 기존 필드 유지 + 아래 추가
  songId          String?          // 새 예약은 필수, 이관된 기존 예약은 NULL
  createdByUserId String?          // 게스트·레거시는 NULL
  cancelledAt     DateTime?
  cancelledBy     String?          // USER | GUEST | ADMIN | SYSTEM
  reminderSentAt  DateTime?
  // 부분 unique: (startTime) WHERE status IN (CONFIRMED, CONFIRMED_ADMIN)
}

model LimitPolicy {               // 공연 시즌 제한 (기간 동안 자동 적용)
  id, startDate, endDate, maxSlotsPerWeek, maxSlotsPerDay, performanceId?
}
// 기본 제한값은 SystemConfig(MaxSlotsPerWeek / MaxSlotsPerDay)에 둔다

model Performance {
  id, name, date, venue, applyStartAt, applyEndAt, maxSongsPerTeam
}
model PerformanceApplication {
  id, performanceId, teamId,
  status        // SUBMITTED | REVIEWING | ACCEPTED | REJECTED (사유는 저장하지 않음)
  videoReceived Boolean @default(false)   // 영상은 카톡으로 담당자에게 전송
  submittedAt
}
model ApplicationSong { applicationId, songId, setlistOrder Int? }  // 라인업 = 곡 순서

model PushSubscription { id, userId, endpoint @unique, p256dh, auth, userAgent }
model NotificationPreference {    // 사용자별: 받을 알림 종류(고정 목록) + 리마인더 시간
  userId @id, enabledTypes String[], reminderMinutesBefore Int @default(120)
}
model NotificationTeam { userId, teamId, enabled }   // 알림 받을 팀 선택
model NotificationLog { id, type, reservationId?, userId, sentAt, @@unique([type, reservationId, userId]) }  // 중복 발송 방지

// 구인 게시판 (Beta)
model RecruitPost {
  id, authorId, songId, youtubeUrl?,
  performanceChoice   // PERFORMANCE | UNDECIDED | NO
  performanceId?, status   // OPEN | CLOSED | TEAM_CREATED
}
model RecruitSlot { id, postId, label, sortOrder, filledName?, filledUserId? }   // 기본 6칸 + 추가 가능
model RecruitApplication { id, slotId, userId, status }                          // PENDING | ACCEPTED | REJECTED
model RecruitComment { id, postId, authorId, body, createdAt }

model GuestAuthAttempt { teamId, ipHash, failedCount, lockedUntil }   // 5회 실패 시 5분 잠금
```

---

## 5. 사용자와 팀

### 5.1 사용자 (카카오 로그인, 선택 사항)

- 카카오 로그인은 **팀 연결, 알림, 구인 게시판**에 필요하다. 예약하고 팀을 관리하는 데는 필요 없다.
- 프로필 항목: 이름, 학번, 세션(여러 개 선택 가능), 기수
- **학번 마스킹**: 전체 학번은 본인과 관리자에게만 보이고, 다른 사람에게는 `202015***` 형태로 보인다.
- 가입할 때 **개인정보 수집·이용 동의**를 받는다. 처리방침 페이지를 만들고, 그 URL을 카카오 앱 설정에 등록한다.
- **관리자**는 `role = ADMIN`인 카카오 사용자다. 최초 관리자는 DB에서 직접 지정하고, 그다음부터는 관리자가 다른 사용자에게 권한을 준다. 기존 관리자 비밀번호 방식은 없앤다.

### 5.2 팀

- 팀장이라는 개념은 없다. **연결된 팀원과 팀 비밀번호를 아는 게스트는 모든 작업을 할 수 있다.** 예약 확인과 취소, 팀명·설명·곡·팀원 수정, 비밀번호 변경, 초대 링크 재발급, 팀 삭제가 모두 포함된다.
- **팀 연결**
  - 마이페이지 → 팀 연결 → 팀명 검색 + 비밀번호 입력
  - 또는 초대 링크로 바로 연결
  - 연결할 때 **"이 팀원 중 누구인가요?"** 목록에서 자기 행을 고르거나 새 행을 추가한다
  - 연결 해제는 자유롭게 할 수 있다
- **팀 등록 모달**

  | 항목 | 필수 여부 |
  |---|---|
  | 팀명 | 필수. 입력하면 비슷한 이름의 기존 팀을 먼저 보여준다 |
  | 곡 | 선택. 여러 개 가능, §9 곡 검색 사용 |
  | 설명 | 선택 |
  | 팀원 | 선택. `세션 드롭다운 \| 이름` 행 + "팀원 추가하기" 버튼 |
  | 비밀번호 | 필수 |

- **팀 삭제는 소프트 삭제**다.
  - 삭제 전에 "앞으로 잡힌 예약 N건이 취소됩니다"를 확인받는다.
  - 앞으로 잡힌 예약은 취소하고, 지난 예약은 통계용으로 보존한다.
  - 관리자는 삭제된 팀을 복구할 수 있다.
- **관리자 팀 병합**: 두 팀을 하나로 합친다. 예약, 곡, 팀원, 연결을 남기는 팀으로 옮기고, 합쳐진 팀은 `mergedIntoId`로 표시한다. 합치기 전에 같은 시간대 예약이 겹치면 경고한다.
- **게스트 비밀번호 보호**: 팀 + IP 기준으로 5번 틀리면 5분 동안 잠근다.

---

## 6. 예약

### 6.1 규칙 (기존 README 기준으로 확정)

- **타임슬롯**: 매시 정각에 시작해서 50분 동안 진행한다. 하루 슬롯은 09:00부터 22:00까지 14개이고, 모든 시각은 KST 기준이다.
- **주차**: 미국식이다. 일요일에 시작하고, 1월 1일이 들어 있는 주가 1주차다. 화면 표기는 "N월 N주차"이고, 그 주의 수요일이 속한 달을 기준으로 한다.
- **주차 전환: 일요일 00:00 KST** (README에 18시라고 적힌 부분은 틀렸다)
  - 이전 주차는 CLOSED, 현재 주차는 OPEN, 그다음 주차는 UPCOMING이 된다
  - 미리 예약(PENDING)을 집계한다: 1팀만 신청한 슬롯은 CONFIRMED가 되고, 2팀 이상이면 전부 VOID가 된다
- **바로 예약**: OPEN 주차에서 선착순이고 즉시 CONFIRMED가 된다.
- **미리 예약**: UPCOMING 주차에서 PENDING으로 신청한다. **대기 중인 팀명은 지금처럼 공개**한다.
- **관리자 예약**: 즉시 CONFIRMED_ADMIN이 된다. 팀과 상관없는 시스템 예약이다.
- **제한**: 팀별로 주당·하루 최대 슬롯 수를 둔다 (CONFIRMED + PENDING 기준).
  - 기본값은 SystemConfig에 둔다.
  - **공연 시즌**: 관리자가 기간(시작일~종료일)과 그 기간의 제한값을 LimitPolicy로 등록하면 자동으로 적용된다. 공연을 등록할 때 "공연 N주 전부터"를 기본값으로 제안하고, 관리자가 수정할 수 있다.
  - 하루 최대를 1로 두면 연속 예약이 금지된다. 공연 시즌에 2로 두면 연속 2시간이 허용된다.

### 6.2 예약 모달 흐름

타임슬롯을 누르면 예약 모달이 뜬다.

1. **팀 입력칸 (드롭다운 자동완성)**
   - 글자를 입력하면 등록된 팀이 뜬다.
   - 결과가 없으면 드롭다운에 **"'OOO' 팀 등록하기"** 버튼이 뜨고, 누르면 팀 등록 모달이 열린다.
   - 카카오로 로그인한 사용자는 **연결한 팀이 목록 위쪽**에 먼저 뜬다.
2. **곡 선택 (필수, 1개)**: 팀이 선택되면 그 팀의 곡 목록이 뜬다. 목록 아래에 **"곡 추가"** 버튼이 있다. 곡이 없는 기존 팀도 여기서 곡을 추가하면 된다.
3. **비밀번호**
   - 30일 안에 이 기기에서 비밀번호를 맞힌 팀이나, 로그인 사용자가 연결한 팀이면 이 단계를 건너뛴다.
   - 여러 팀을 기억할 수 있다.
   - 비밀번호를 평문으로 저장하지 않는다.

### 6.3 주차 전환 방식: 첫 요청이 전환을 실행

Cron 정확도에 의존하지 않고 **00:00:00 이후 첫 요청이 곧 전환 시점**이 되게 한다.

```
모든 예약·조회 요청
  → ensureRotated(now):
      현재 시각(KST)으로 "지금 OPEN이어야 할 주차" 계산
      DB의 OPEN 주차와 다르면
        BEGIN
          pg_advisory_xact_lock(<rotation key>)
          다시 확인 (이미 다른 요청이 전환했으면 아무것도 하지 않음)
          CLOSED/OPEN/UPCOMING 갱신 + PENDING 집계
        COMMIT
  → 예약 처리
```

- 전환과 집계를 **하나의 트랜잭션**으로 묶는다. 기존 코드처럼 OPEN으로 바꾼 뒤 집계하기 전 사이에 바로 예약이 끼어드는 문제가 없어진다.
- 여러 번 실행되어도 결과가 같다(멱등).
- pg_cron과 cron-job.org는 보조 역할이다. 아무도 접속하지 않은 주에도 DB 상태가 정리되게 한다.

### 6.4 동시성

- 바로 예약은 Serializable 트랜잭션으로 처리한다. 추가로 **부분 unique 인덱스**(`startTime`, 확정 상태 한정)로 DB 차원에서도 중복을 막는다.
- 직렬화 충돌(P2034/40001)이 나면 "이미 예약된 시간대"로 응답한다. 미리 예약에도 똑같이 적용한다.
- 모든 시각은 **타임존이 포함된 ISO 문자열**로 주고받는다. 기존의 오프셋 없는 `'YYYY-MM-DD HH:mm'` 형식은 쓰지 않는다.
- 주차는 **`id` 하나로만 식별**한다. 기존 코드처럼 `weekNumber`와 섞어 쓰지 않는다.

### 6.5 일괄 처리 (서버 API 한 번 호출)

| 기능 | 대상 | 방식 |
|---|---|---|
| 사용자 일괄 취소 | 팀 관리 페이지에서 본인 팀 예약 | 가능한 건만 취소하고, 실패한 건은 사유와 함께 표시. CANCELLED/VOID 상태는 선택 대상에서 제외 |
| 관리자 일괄 취소 | 기간, 팀, 선택한 예약 | 한 트랜잭션으로 처리하고, 해당 팀원에게 취소 알림 |
| 관리자 반복 예약 | 날짜 여러 개 × 시간 (예: 매주 화 19~21시, 12주) | ① **미리보기**: 겹치는 기존 예약 목록 표시 → ② **덮어쓰기 / 건너뛰기** 선택 → ③ **한 트랜잭션으로 확정** (전부 되거나 전부 안 됨). 덮어쓴 예약의 팀원에게 취소 알림 |

### 6.6 실시간 반영

1. **내 행동은 즉시 반영한다.** 낙관적 업데이트로 응답을 기다리지 않고 화면을 먼저 바꾸고, 실패하면 되돌린다. 예약표 캐시는 TanStack Query로 관리한다.
2. **다른 사람의 행동**: `reservations` 테이블이 바뀌면 DB 트리거가 `week:<id>` 채널로 Broadcast를 보낸다. 구독 중인 화면은 그 주차 예약표를 다시 불러온다. 보통 1초 이내에 반영된다.
3. **안전장치**
   - Realtime 연결이 끊겼을 때만 10초 간격으로 폴링한다.
   - 탭이 다시 활성화되면 즉시 다시 불러온다.
   - 탭이 보이지 않을 때는 폴링을 멈춘다.
4. 실시간 반영은 사용자 경험을 위한 것이다. **공정성은 DB 트랜잭션이 보장한다.**

---

## 7. 알림 (Web Push)

- 카카오 로그인 사용자가 기기마다 푸시 구독을 등록한다.
- **아이폰은 홈 화면에 추가(PWA)해야** 알림을 받을 수 있다 (iOS 16.4 이상). 알림을 켤 때 안내 화면을 보여준다.
- 사용자 설정
  - **받을 알림 종류**: 아래 고정 목록에서 선택
  - **알림 받을 팀**: 연결된 팀 중에서 선택
  - **리마인더 시간**: 사용자가 직접 설정 (기본 2시간 전)

| 알림 종류 | 받는 사람 | 발송 시점 |
|---|---|---|
| 예약 생성 | 팀원 (게스트가 예약한 경우 포함) | 예약 직후 |
| 미리 예약 결과 (확정/폭파) | 팀원 | 주차 전환 트랜잭션 커밋 후 |
| 예약 취소 (사용자, 관리자, 덮어쓰기) | 팀원 | 취소 직후 |
| 합주 리마인더 | 팀원 | cron-job.org가 5분마다 호출 → 보낼 대상 선별 |
| 공연 신청 결과 (합격/불합격) | 팀원 | 관리자가 결과를 확정할 때 |
| 구인: 지원 들어옴 / 지원 수락됨 | 글쓴이 / 지원자 | 즉시 |

- `NotificationLog`의 unique 제약으로 **같은 알림이 두 번 발송되지 않게** 한다.
- 만료된 구독(HTTP 404/410 응답)은 삭제한다.

---

## 8. 공연과 대시보드

### 8.1 공연

- 관리자가 공연을 만든다. 항목: 이름, 날짜, 장소, **신청 기간**, 팀당 최대 곡 수, 시즌 제한값(LimitPolicy).
- **신청**
  - 팀 비밀번호를 아는 사람이나 연결된 팀원이 신청한다.
  - 팀 레퍼토리에서 곡을 고른다.
  - 신청 기간이 끝나면 수정할 수 없다.
- **오디션 영상**: 지금처럼 **카톡으로 담당자에게 전송**한다. 신청서에 "담당자 카톡으로 영상 보내기" 링크를 두고, 관리자 심사 화면에 **"영상 받음" 체크**를 둔다.
- **심사**: 시청 → 심사 → **합격/불합격**. 사유는 공개하지 않는다. 결과는 알림으로 보낸다.
- **라인업**
  - 합격한 팀의 곡만 올라간다.
  - **곡 순서를 드래그로 정하면 팀 순서는 곡 순서에 따라 자동으로 정해진다.**

### 8.2 대시보드

| 항목 | 공개 범위 |
|---|---|
| 이번 주 예약 현황 (전체 슬롯 대비 예약률, 요일·시간대 히트맵) | 모든 사용자 |
| 이번 주 합주 곡 목록 (예약에 연결된 곡 기준) | 모든 사용자 |
| 공연별 라인업, 세션 구성 | 모든 사용자 |
| 팀별 예약 시간, 미리 예약 폭파 건수 | 관리자 |
| 활동 중인 팀 수, 오래 예약하지 않은 팀 | 관리자 |

---

## 9. 곡 검색

2026-09-25에 실제 곡 8개로 직접 비교한 결과를 바탕으로 정했다.

- 입력칸은 **곡명과 가수 두 칸**이다. 곡명 자동완성에서 곡을 고르면 **가수 칸이 자동으로 채워진다.**
- **검색 순서**
  1. **우리 DB** (`Song` 테이블). 동아리에서 이미 등록한 곡이 먼저 나온다.
  2. **MusicBrainz**와 **iTunes Search(`country=US`)**를 동시에 호출한다.
     - 두 API 모두 CORS를 허용하므로 **브라우저에서 직접 호출**한다. 호출 제한이 사용자 IP별로 적용된다.
     - 500ms 디바운스를 건다.
     - MusicBrainz는 곡명·가수를 나눈 구조화 쿼리(`recording:"…" AND artist:"…"`)를 쓴다.
  3. 두 결과를 합치고 중복을 없앤다. **한글 표기를 우선**한다. MusicBrainz는 한글 표기를 그대로 주고, iTunes는 영문 표기를 준다.
  4. 결과가 없으면 입력한 그대로 저장한다. 고른 뒤에도 표기를 수정할 수 있다.
- **미리듣기는 제공하지 않는다.**
- 제외한 후보
  - Deezer: 검색 정확도가 낮고 서버 프록시가 필요하다
  - Discogs: 곡이 아니라 앨범 단위 데이터다
  - Spotify: 2026년부터 개발 모드는 사용자 5명 제한이다
  - YouTube Data API: 검색이 하루 100회로 제한된다
  - 멜론 MCP: 사용자마다 멜론 OAuth가 필요하고 화이트리스트 방식이다
- 이 검색 컴포넌트는 팀 레퍼토리, 예약 모달의 "곡 추가", 공연 신청, 구인 게시판에서 **같이 쓴다.**

---

## 10. 구인 게시판 (Beta – 관리자에게만 공개)

양식:

```
- 노래 제목 - 가수          (§9 곡 검색)
- 정기공연 참여 여부        (예 → 등록된 공연 중 선택 / 미정 / 아니오)
- 보컬 –
- 기타1 –
- 기타2 –
- 드럼 –
- 베이스 –
- 건반 –
  (+ 세션 칸 추가 가능: 기타3, 코러스 등)
🔗 노래 유튜브 링크        (게시글에서 YouTube IFrame으로 재생, oEmbed로 링크 확인)
```

- 세션 칸에는 **정해진 사람 이름**을 적거나 **모집 중**으로 둔다. 이름은 직접 입력하거나 가입 사용자를 골라 연결한다. 동명이인은 마스킹된 학번으로 구분한다.
- **지원 방법**
  - 댓글
  - **"이 세션 지원"** 버튼 → 글쓴이에게 알림 → 글쓴이가 수락하면 그 칸이 채워지고 지원자에게 알림
- 모든 칸이 채워지면 **"이 멤버로 팀 만들기"** 버튼으로 팀, 곡, 팀원 행을 자동으로 만든다.

### 10.1 참고: 카카오톡 알림을 쓰지 않는 이유

- 카카오 공식 문서는 카카오톡 메시지 API가 "사용자 간 전송만 지원하며 서비스가 사용자에게 발송할 수 없다"고 명시한다.
- 서비스가 사용자에게 보내는 공식 경로는 알림톡뿐이다. 알림톡은 사업자등록이 필수이고 건당 요금이 붙는다.
- "나에게 보내기" API를 서버에서 호출하는 방식은 운영정책상 회색지대라서 제외했다.

---

## 11. 디자인과 홈 화면

- **디자인 시스템: Meta Astryx** (`@astryxdesign/core`, MIT, 2026-09 기준 0.6.x 베타, StyleX 기반)
  - Tailwind v4는 레이아웃 보조로만 쓴다. 이때 `@layer` 순서를 반드시 선언해야 한다.
  - 애니메이션은 **Motion(`motion/react`)**을 쓴다.
  - **본격 개발 전에 검증용 시제품을 만든다** (1~2일). Next.js App Router + Astryx + Tailwind + Motion을 조합해서 예약표 그리드, 예약 모달, 페이지 전환을 만들어 보고 호환성과 애니메이션 품질을 확인한다. Astryx와 Motion을 함께 쓸 수 있는지는 아직 검증되지 않았다.
- 아이콘 라이브러리는 하나로 통일한다 (기존에는 lucide와 phosphor를 섞어 썼다).
- `alert`/`confirm` 대신 토스트와 확인 모달을 쓴다.
- **홈 화면**
  - 오디오 비주얼라이저와 필름 그레인 효과는 유지한다.
  - 가운데 큰 PLAY 버튼과 진행 바는 **왼쪽 아래 곡 정보 영역(앨범 커버 · TAURUS - TAURUS · BY 작곡자)으로 옮기고**, 작은 재생/정지 버튼과 진행 바로 바꾼다.
  - 가운데 주요 버튼은 **"바로 예약하기"**와 **"팀 관리하기"** 두 개다. "팀 관리하기"를 누르면 로그인 사용자는 연결된 팀 목록으로, 게스트는 팀 검색 + 비밀번호 화면으로 간다.
- `design-system-test` 페이지는 운영 환경에서 제거한다.

---

## 12. 데이터 이관

1. 이관하는 동안 Railway의 기존 서비스는 계속 운영한다. **일요일 00:00 전후를 피해서** 한 번에 전환한다.
2. `pg_dump`로 기존 DB를 떠서 새 스키마로 변환한다.
   - `teams`: UUID, 이름, bcrypt 해시(`$2b$`)를 그대로 옮긴다. 검증은 앱 코드(bcryptjs)에서 한다. pgcrypto `crypt()`와 호환되지 않을 수 있다. 기존 `role=ADMIN` 팀 계정은 옮기지 않는다.
   - `weeks`: `id`, `year`, `weekNumber`를 그대로 보존한다.
   - `reservations`: 모든 상태를 보존한다. `songId`와 `createdByUserId`는 NULL로 둔다. 관리자 예약(teamId NULL)도 유지한다.
   - `system_configs`: 제한 기본값을 옮긴다.
3. 2026-02-16 timestamptz 전환 마이그레이션 **이전에 만들어진 예약은 시각이 밀렸는지 검증**한다.
4. 기존의 팀 삭제 시 예약 cascade 삭제 동작은 없앤다. 소프트 삭제로 대체한다.
5. 이관이 끝나면 관리자가 중복 팀을 병합한다(§5.2).
6. 기존 코드는 `legacy` 태그로 보존하고, 같은 저장소의 새 브랜치에서 개발한다.

### 12.1 기존 코드에서 옮겨올 것

- 상수: 슬롯, 제한, 타임존 (`apps/server/src/common/constants.ts`, `constants/week.constants.ts`)
- 주차 생성과 "N월 N주차" 계산 (`week.service.ts`의 `generateWeeksData`, `calculateDisplayName`). **순수 함수로 옮기고 README 예시로 유닛 테스트**를 작성한다.
- 슬롯 검증, 주당·하루 제한, 미리 예약 집계 규칙 (`reservation.service.ts`)
- e2e 시나리오 ID 목록(R-/A-/AD-/E-). 새 테스트의 명세 체크리스트로 쓴다.
- 홈 오디오 비주얼라이저 (`useAudioVisualizer`, `FilmGrain`), 음원, 이미지

### 12.2 새로 만들면서 고치는 기존 결함

| 결함 | 위치 (legacy) | v2에서의 처리 |
|---|---|---|
| 주차 전환이 트랜잭션이 아니고, cron을 놓치면 PENDING이 집계되지 않음 | `week.service.ts:345-376`, `reservation.service.ts:235-273` | §6.3 |
| 주차 id와 weekNumber를 섞어 씀 → 연말이나 2027년에 깨질 위험 | `reservation.service.ts:386`, `useWeek.ts:21-23` | id로만 식별 |
| 예약 시각에 타임존 오프셋이 없음 | `InstantReservationPage.tsx:34-37` | ISO + 오프셋 |
| 로그인한 팀이면 누구나 주차 전환을 실행할 수 있음 | `week.controller.ts:25-33` | 관리자와 cron 비밀키만 허용 |
| 팀 비밀번호를 평문으로 sessionStorage에 저장 | `AuthContext.tsx:74` | 서명된 httpOnly 쿠키 |
| 관리자 비밀번호를 평문으로 비교, 토큰을 폐기할 수 없음 | `admin.service.ts:37`, `jwt.strategy.ts:23` | 카카오 사용자 + ADMIN 권한 |
| 일괄 처리가 단건 요청 N번이라 원자성이 없음. 에러가 항상 "500"으로 표시되고, 일괄 작업 바가 겹쳐 뜸 | `AdminTeams.tsx`, `ReservationList.tsx`, `AdminReservations.tsx` | §6.5 |
| 관리자 예약이 겹치는 예약을 안내 없이 취소 | `admin.service.ts:94-164` | 미리보기 → 선택 → 트랜잭션 |
| 슬롯 중복을 DB unique로 막지 않음, 미리 예약 동시 요청 시 500 | `reservation.service.ts:108-155` | 부분 unique + 충돌 처리 |
| 팀 삭제 시 예약 이력이 cascade로 삭제됨 | `schema.prisma:88` | 소프트 삭제 |

---

## 13. 아직 검증하지 않은 위험

| 항목 | 영향 | 대응 |
|---|---|---|
| Astryx와 Motion의 호환성 (공식 언급 없음) | 디자인과 애니메이션 전체 | 검증용 시제품에서 먼저 확인. 문제가 있으면 대안을 검토 |
| Astryx가 베타(0.x)라 API가 바뀔 수 있음 | 업그레이드 비용 | 버전을 고정하고, 사용 컴포넌트를 래핑 |
| Supabase 유지 신호가 실제로 일시정지를 막는지 (기준 비공개) | 00:00 오픈 전체 | 매일 호출 + 예비 호출 + 경고 메일 확인 + 백업 |
| MusicBrainz 호출 제한(초당 1회, IP 기준)과 K-인디 곡 수록 범위 | 곡 자동완성 품질 | 우리 DB 우선 + iTunes 병행 + 직접 입력 허용 |
| iTunes Search API 약관을 비Apple 웹앱에 어떻게 적용하는지 | 검색 보조 소스 | 문제가 되면 MusicBrainz와 우리 DB만 사용 |
| Vercel Hobby는 비상업 용도만 허용 | 호스팅 | 동아리 비영리 용도라 해당 없음. 유료화하면 재검토 |
| Web Push를 받으려면 아이폰에서 홈 화면 추가가 필요 | 알림 도달률 | 설치 안내 화면 |

---

## 14. 폴더 구조와 설계 원칙

### 14.1 설계 원칙

- **가벼운 DDD**: 업무 용어(주차, 슬롯, 미리 예약, 폭파, 라인업)를 코드 이름으로 그대로 쓴다.
- **계층형 구조**: `action → service → repository`. 핵심 규칙은 프레임워크에 의존하지 않는 순수 함수(`packages/domain`)로 둔다.
- **기능 단위 폴더** (`features/*`)
- **도메인 로직 TDD**
- **DAL/DTO**: 서버 전용 데이터 접근 계층이 인가를 확인하고, 필요한 필드만 반환한다.
- 원칙끼리 충돌하면 **KISS와 YAGNI를 우선**한다.

### 14.2 모노레포 (pnpm workspaces)

Turborepo는 빌드나 CI가 느려지면 그때 추가한다.

```
taurus/
├─ apps/
│  └─ web/                     # Next.js App Router (화면 + 서버)
├─ packages/
│  ├─ domain/                  # 순수 규칙 (주차·표기·슬롯·집계·제한·정규화·마스킹). React/Next/Prisma 의존 금지
│  ├─ db/                      # Prisma 스키마·마이그레이션(트리거, pg_cron, 부분 unique SQL 포함)·클라이언트·이관 스크립트
│  ├─ ui/                      # Astryx 래핑 컴포넌트 + Motion 프리셋 + 토큰
│  └─ config/                  # 공유 tsconfig / eslint / prettier
├─ docs/
├─ .github/workflows/          # CI, 매일 백업, keepalive 예비 호출
└─ pnpm-workspace.yaml
```

- `packages/domain`은 웹 앱과 이관 스크립트(`packages/db`) **두 곳에서 쓰기 때문에** 별도 패키지로 둔다.
- `packages/core`(서버 로직 패키지)는 만들지 않는다. **두 번째 사용처(API 앱, 워커)가 실제로 생길 때 추출**한다. 추출하기 전에 쿠키, `next/headers` 같은 Next.js 의존을 먼저 떼어내야 한다.

### 14.3 `apps/web/src`

```
app/                                   # 라우팅 전용. page.tsx는 features를 조립만 함
├─ (public)/page.tsx                   # 홈
├─ (public)/reserve/{instant,pre}/page.tsx
├─ (public)/teams/[teamId]/page.tsx
├─ me/ · performances/ · dashboard/ · recruit/ · admin/
├─ auth/callback/route.ts · invite/[token]/page.tsx
├─ api/weeks/[weekId]/reservations/route.ts   # GET: 실시간 신호·폴링 때 클라이언트가 다시 조회
├─ api/cron/{keepalive,reminders,rotation}/route.ts
└─ layout.tsx · providers.tsx

features/<feature>/                    # reservation, week, team, auth, song, notification,
├─ components/                         # performance, dashboard, recruit, admin
├─ hooks/
├─ actions.ts                          # 'use server': 입력 검증 → service 호출 → DTO만 반환
├─ server/                             # import 'server-only'
│  ├─ service.ts                       #   인증·인가·트랜잭션·규칙 조율 (DAL)
│  ├─ repository.ts                    #   Prisma 쿼리만
│  ├─ dto.ts                           #   화면에 내보낼 최소 데이터
│  └─ index.ts                         #   서버용 공개 입구 (다른 기능의 server/가 사용)
├─ schemas.ts                          # zod
├─ types.ts · constants.ts
└─ index.ts                            # 클라이언트용 공개 입구 (클라이언트에서 써도 안전한 것만)

shared/
├─ server/                             # getActor(사용자/게스트 판별), env, Supabase 서버 클라이언트
├─ lib/ · hooks/ · components/ · utils/ · types/
styles/globals.css                     # @layer 순서 선언
public/                                # sw.js, manifest, audio, images
e2e/                                   # Playwright
```

### 14.4 의존 규칙 (ESLint로 강제)

- 의존 방향은 `app → features → shared → packages`로만 흐른다.
- 기능끼리는 공개 입구로만 가져온다.
  - 클라이언트 코드는 `features/x/index.ts`를 통해서만
  - 서버 코드는 `features/x/server/index.ts`를 통해서만
- `process.env`와 Prisma는 `server/`와 `shared/server/`에서만 가져올 수 있다.
- **읽기**
  - Server Component는 `server/` 함수를 직접 호출한다. 자기 앱의 `/api`를 다시 거치지 않는다.
  - Route Handler GET은 클라이언트가 다시 조회할 때만 쓴다. Server Action은 순서대로 실행되므로 조회에 쓰지 않는다.
- **쓰기**: Server Action → service. Server Action은 누구나 직접 POST로 호출할 수 있는 공개 입구이므로, **액션마다 인증·인가를 다시 확인**하고 DTO만 반환한다.
- **테스트 위치**
  - `packages/domain`: 유닛 테스트(Vitest, `*.test.ts`를 같은 폴더에)
  - `service`: 테스트 DB에 붙는 통합 테스트
  - 사용자 흐름: `e2e/`

---

## 15. 다음 단계

1. **검증용 시제품**: Next.js + Astryx + Tailwind + Motion으로 예약표, 모달, 전환 애니메이션을 만든다.
2. **구현 계획 작성**: 단계별 작업, 테스트 전략, 이관 리허설 계획을 포함한다.
3. 인프라 준비
   - Supabase 프로젝트(서울) 생성
   - 카카오 앱 설정(동의항목, 리다이렉트 URI, 처리방침 URL)
   - VAPID 키 생성
   - cron-job.org와 GitHub Actions 설정
4. 단계별 구현 → 이관 리허설 → 전환

---

## 부록 A. 결정 기록

| 번호 | 결정 |
|---|---|
| 인프라 | Next.js + Vercel Hobby + Supabase Free(DB·Auth·Realtime 전부). Neon 대신 Supabase를 쓰고, 일시정지 대책을 둔다 |
| Q1 | 로그인 단위 = 카카오 사용자. 팀은 그룹이고, 한 사람이 여러 팀에 소속될 수 있다 |
| Q2 | 팀은 계속 유지되는 개체. 곡은 팀의 레퍼토리이고, 공연 참가 = 팀 + 곡 선택 |
| Q3/Q7/Q8 | 로그인 필수 금지. 게스트는 팀 검색 + 비밀번호로 예약하고, 팀도 만들 수 있다 (유사 이름 경고) |
| Q6 | 기존 예약과 팀은 전부 이관 |
| Q9 | 로그인하지 않은 팀원도 이름과 세션으로 추가할 수 있다. 프로필은 이름, 학번, 세션, 기수 |
| Q10/Q37 | 팀장은 없다. 팀원과 게스트(비밀번호)는 모든 작업을 할 수 있다 |
| Q11 | 관리자가 중복 팀을 병합할 수 있다 |
| Q12 | 알림은 Web Push(PWA) |
| Q13/Q39 | 알림 종류: 예약 생성, 미리 예약 결과, 취소, 리마인더(사용자 설정), 공연 신청 결과, 구인 지원/수락 |
| Q14/Q16 | 실시간은 Supabase Realtime. DB도 Supabase에 둔다 |
| Q15 | 받을 알림 종류와 받을 팀을 따로 선택 |
| Q18 | 게스트도 예약을 취소할 수 있다 |
| Q19 | 팀 삭제는 소프트 삭제 |
| Q20 | 관리자 = ADMIN 권한을 받은 카카오 사용자 |
| Q21/Q25/Q40 | 팀이 신청하고 관리자도 추가할 수 있다. 시청 → 심사 → 합격/불합격, 사유 비공개, 신청 기간 있음, 곡 순서로 라인업 구성 |
| Q22 | 대시보드 항목은 전부 넣고, 공개 범위는 항목마다 다르게 |
| Q23/Q26 | 구인 게시판은 Beta로 관리자에게만 공개. 댓글 + 세션 지원, 팀 자동 생성 |
| Q24/Q35/Q36 | 일괄 처리는 서버 API 한 번 호출. 관리자 반복 예약은 미리보기 → 덮어쓰기/건너뛰기 → 트랜잭션 |
| Q27 | 같은 저장소의 새 브랜치에서 새로 만든다. legacy 태그 |
| Q28 | 전환은 00시, 대기 팀명 공개 유지, 설명은 팀 등록 때 받는다 |
| Q29' | 오디션 영상은 카톡 전송 + "영상 받음" 체크 |
| Q30' | 곡명·가수 두 칸, 곡명을 고르면 가수 자동 입력. 우리 DB → MusicBrainz + iTunes, 한글 우선, 미리듣기 없음 |
| Q31 | Astryx 검증용 시제품을 먼저 만든다 |
| Q32 | 곡 선택 필수("곡 추가" 가능), 비밀번호 30일 기억, 연결한 팀은 비밀번호 생략, 유사 이름 경고 |
| Q33 | 팀 등록 모달의 팀원 섹션은 `세션 \| 이름` 행 (선택 입력) |
| Q34 | 공연 시즌 제한은 기간을 정해 자동 적용 |
| Q38 | 팀 연결 시 "이 팀원 중 누구인가요?"로 자기 행을 고른다. 학번은 본인 외 마스킹 |
| Q41 | Prisma를 쓰고 모든 DB 접근은 서버에서 한다. 브라우저는 Realtime 구독만 |
| Q42/Q43 | 홈: 비주얼라이저 유지, 재생 버튼은 곡 정보 영역으로, 주요 버튼은 "바로 예약하기" / "팀 관리하기" |
| Q44 | 관리자는 전체 학번을 볼 수 있다. 개인정보 동의와 처리방침을 둔다 |
| 실시간 | 낙관적 업데이트 + Realtime Broadcast + 끊겼을 때 10초 폴링 |
