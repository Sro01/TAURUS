# Taurus Monorepo 디렉토리 구조

## 1. 개요
현재의 `src` 프로젝트 구조를 `apps/client`로 그대로 이전합니다.
`apps/server` 폴더에는 NestJS 표준 구조를 초기화합니다.
전반적으로 **모노레포(Monorepo)** 환경을 구축하여 관리합니다.

## 2. 디렉토리 구조 트리

```
Taurus/
├── .agent/
├── .vscode/
├── apps/
│   ├── client/              # React (Vite) - 기존 소스 그대로 이동
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── assets/      # 정적 자산 (이미지, 폰트)
│   │   │   ├── components/  # 공통 컴포넌트
│   │   │   │   ├── common/  # 버튼, 인풋 등 아토믹 컴포넌트
│   │   │   │   ├── layout/  # 헤더, 풋터, 사이드바 등 레이아웃
│   │   │   │   └── scheduler/ # 예약 시스템 전용 컴포넌트
│   │   │   ├── constants/   # 전역 상수 (하드코딩 값 관리)
│   │   │   ├── contexts/    # React Context (Auth, Theme 등)
│   │   │   ├── hooks/       # 커스텀 훅 (useAuth, useBooking 비즈니스 로직)
│   │   │   ├── pages/       # 라우트 페이지 (홈, 관리자, 로그인 화면)
│   │   │   ├── services/    # API 호출 (Axios 인스턴스 및 요청 함수)
│   │   │   ├── types/       # 클라이언트 타입 (또는 공유 패키지 타입)
│   │   │   ├── utils/       # 헬퍼 함수 (날짜 포맷팅 등)
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   │
│   └── server/              # NestJS 애플리케이션 (백엔드)
│       ├── src/
│       │   ├── common/      # 공통 모듈 (Guard, Interceptor, Filter)
│       │   ├── config/      # 환경 변수 및 설정 관리
│       │   ├── modules/     # 기능별 모듈
│       │   │   ├── auth/    # 인증 모듈 (로그인, 가드)
│       │   │   ├── user/    # 유저 모듈 (팀 정보 조회)
│       │   │   ├── booking/ # 예약 모듈 (핵심 비즈니스 로직)
│       │   │   └── week/    # 주차 관리 모듈 (스케줄러/자동반환)
│       │   ├── prisma/      # 데이터베이스 스키마 및 클라이언트
│       │   └── main.ts
│       ├── test/
│       ├── tsconfig.json
│       └── nest-cli.json
│
├── packages/                # 공유 코드 (초기엔 복잡도 낮추기 위해 생략 가능)
│   └── api-types/           # 공유 DTO 및 인터페이스 (Zod 스키마)
│
├── docker-compose.yml       # 개발용 DB (Postgres + Redis) 설정
├── turbo.json               # 빌드/배포 파이프라인 설정
├── pnpm-workspace.yaml      # 워크스페이스 정의 파일
└── package.json             # 루트 스크립트
```

## 3. 핵심 아키텍처 컨셉

### 클라이언트 구조 (기존 유지)
- **계층형 구조**: `pages` -> `components` -> `services` 흐름 유지
- **관심사 분리**:
  - `pages`: 라우팅 및 데이터 페칭 조율
  - `components`: 순수 UI 렌더링
  - `hooks`: 재사용 가능한 상태 및 로직
  - `services`: 순수 API 통신 담당

### 서버 구조 (NestJS)
- **모듈화**: 각 기능(`auth`, `booking`)을 독립적인 모듈로 분리하여 의존성 관리
- **Prisma ORM**: DB 스키마를 단일 진실 공급원(Single Source of Truth)으로 사용
