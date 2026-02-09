# Taurus 아키텍처 설계 제안서 (Final)

## 1. 프로젝트 비전 및 요구사항 재정의

### 프로젝트 성격
- **지속 가능한 서비스**: 동아리 존속과 함께 계속 발전 (User: ~200명/학기)
- **비용 효율성**: 대학생 동아리 특성상 유지비용 0원에 수렴하는 구조 지향

### 핵심 요구사항
- **예약 시스템**: 정각 단위, 주차(MainWeek) 개념, 선착순/신청제
- **안정성**: 일요일 18:00 트래픽 집중 시 동시성 제어 필수
- **유지보수성**: 후배 기수에게 인계 가능한 명확한 코드 구조

---

## 2. 시스템 아키텍처: NestJS + PostgreSQL (Docker)

### 시스템 구성도
```mermaid
graph TD
    User[User] -->|https| Vercel[Frontend (Vercel)]
    Vercel -->|REST API| Oracle[Backend Server (Oracle Cloud Free Tier)]
    
    subgraph "Docker Compose (Oracle Cloud)"
        Nginx[Nginx Proxy] --> NestJS
        NestJS[NestJS API] --> Postgres[(PostgreSQL)]
        NestJS --> Redis[(Redis)]
    end
```

### 기술 스택 선정

| 구분 | 기술 | 선정 이유 | 비용 |
| :--- | :--- | :--- | :--- |
| **Frontend** | **React + Vite** | 표준 스택, 빠른 개발 | **$0 (Vercel)** |
| **Backend** | **NestJS** | 구조화된 패턴, 유지보수 용이 | **$0 (Oracle Cloud)** |
| **DB** | **PostgreSQL** | 관계형 데이터 처리 최적화 | **$0 (Self-hosted)** |
| **Infra** | **Docker** | 환경 통일, 배포 자동화 | - |

---

## 3. 배포 및 비용 절감 전략 (Zero Cost)

서버 비용을 **0원**으로 유지하면서도 200명 규모의 트래픽을 감당하기 위한 전략입니다.

### 3.1. Frontend: Vercel (Free Tier)
- **이유**: 정적 사이트 호스팅에 최적화. CDN 자동 적용, GitHub 연동 자동 배포.
- **비용**: 개인/비상업 프로젝트 무료.

### 3.2. Backend & DB: Oracle Cloud Always Free (추천)
- **스펙**: **ARM Ampere A1 Compute** (4 OCPU, 24GB RAM, 200GB Storage) -> 무료 등급 중 압도적 성능.
- **구성**: Docker Compose로 NestJS + PostgreSQL + Redis + Nginx를 한 서버에 띄움.
- **대안 (Oracle 가입 불가 시)**:
  - **AWS Free Tier**: 1년 무료 (t2.micro - 느림) -> 1년 뒤 과금 위험.
  - **동아리방 서버**: 남는 PC에 Ubuntu 설치 + Cloudflare Tunnel (외부 접속) -> 전기세 제외 0원.

### 3.3. SSL/Domain
- **DuckDNS** (무료 도메인) 또는 저렴한 도메인 구입 ($10/년).
- **LetsEncrypt** (무료 SSL 인증서) + Nginx 자동 갱신.

---

## 4. 디렉토리 구조 (Monorepo: Turborepo)
프론트엔드와 백엔드를 하나의 저장소에서 관리합니다. `pnpm-workspace`를 사용하여 의존성을 효율적으로 관리합니다.

```bash
Taurus/
├── .vscode/               # VSCode 설정 (권장 확장프로그램 등)
├── apps/
│   ├── client/            # Frontend (React + Vite)
│   └── server/            # Backend (NestJS)
├── packages/              # 공유 패키지 (Optional)
│   ├── api-type/          # API 타입 정의 (client-server 공유)
│   └── config/            # 공통 설정 (ESLint, TSConfig)
├── docker-compose.yml     # 로컬 개발 및 배포용 DB 설정
├── turbo.json             # Turborepo 설정
└── package.json           # Root Package
```

## 5. 데이터 모델 설계 (개요)

### 주요 엔티티 (ERD)
- **User**: 유저 (Admin 전용, 혹은 팀장)
- **Team**: 팀명, 비밀번호, 기수 정보
- **WeekInfo**: 주차 정보 (시작일, 종료일, 상태: Open/Closed)
- **Reservation**: 예약 메인
  - `status`: `PENDING` | `CONFIRMED` | `CANCELLED` | `VOID`
  - `type`: `INSTANT`(바로) | `PRE`(미리)
- **TimeSlot**: 예약된 시간 슬롯 (중복 방지용 Lock 테이블로도 활용 가능)

---

## 6. 향후 로드맵

1.  **Phase 1 (기반 구축)**: NestJS + React 모노레포 세팅, 로컬 Docker 환경 구성
2.  **Phase 2 (핵심 로직)**: 예약(선착순/신청) 로직 구현, DB 설계
3.  **Phase 3 (배포)**: Oracle Cloud 인스턴스 생성 및 Docker 배포
