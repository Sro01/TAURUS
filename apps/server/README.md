# Taurus Server API

Taurus 프로젝트의 백엔드 서버(NestJS)

## 시작하기

```bash
# 개발 모드 실행
npm run start:dev

# 프로덕션 빌드
npm run build
npm run start:prod
```

## 테스트 (E2E)

이 프로젝트는 Jest와 Supertest를 사용하여 End-to-End (E2E) 테스트를 수행합니다.

### 테스트 실행

모든 E2E 테스트를 순차적으로 실행합니다:

```bash
npm run test:e2e -- --runInBand --forceExit --testPathIgnorePatterns app.e2e-spec
```

특정 모듈만 테스트하려면:

```bash
# 예: Auth 모듈만 테스트
npm run test:e2e -- --testPathPatterns auth --forceExit
```

### 테스트 리포트 확인

테스트가 완료되면 HTML 리포트가 생성됩니다. 브라우저에서 아래 파일을 열어 결과를 확인할 수 있습니다:

`test/reports/e2e-report.html`

## 주요 모듈

- **Auth**: 팀 등록 및 인증 (Verify 패턴)
- **Team**: 팀 정보 관리
- **Reservation**: 합주실 예약 (즉시/미리 예약)
- **Week**: 주차 시스템 및 로테이션
- **Admin**: 관리자 기능 (설정, 강제 제어)
