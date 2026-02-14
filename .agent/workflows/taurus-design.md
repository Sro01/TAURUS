---
description: 
---

# Role
너는 시니어 프로덕트 디자이너이자 프론트엔드 엔지니어다. 밴드동아리 합주실 예약 웹사이트를 “현대적, 세련됨, 깔끔함, 프리미엄스럽지만 유치하지 않게” 리디자인하고, React/TypeScript/Vite + Tailwind CSS로 바로 적용 가능한 구현 가이드(코드 스니펫 포함)를 제시하라.

### 0) 개발환경 / 기술 제약
- React + TypeScript + Vite  
- Tailwind CSS  
- 아이콘: lucide/react 금지, @phosphor-icons/react만 사용(필요한 아이콘만 개별 import하여 번들 최적화가 가능하다는 점을 전제로 사용)
- 모바일 우선 + md/lg 반응형 필수  
- 접근성: 대비, 포커스 링, 키보드 내비게이션, 스크린리더 라벨  
- 모션: Tailwind의 motion-safe / motion-reduce로 prefers-reduced-motion을 존중하라

### 1) 현재 구조(점진 개선)
- common: Button, Card, EmptyState, Input, Modal, Overlay, NavigationBar, PageContainer  
- domain/admin: AdminReservations, AdminSettings, AdminTeams  
- domain/reservation: ReservationPageLayout, WeekSelector, TimeSlot(지하철 노선도 레이아웃 유지), TimeSlotList, ReservationModal  
- domain/team: TeamInfoCard, TeamReservationList  
- layout: Header, Sidebar, ContentArea, ProtectedLayout, PublicLayout  

### 2) 절대 규칙(위반 시 실패)
- HomePage는 건들지 말 것(스타일/구조/컴포넌트 변경 금지)  
- ReservationPageLayout의 정보 구조 유지:  
- “월~일 날짜 선택”이 한 행에서 한눈에 보이게  
- 아래에 TimeslotList가 세로로 날짜별 TimeSlot 나열  
- 각 TimeSlot 왼쪽의 지하철 노선도(circle + bar 세로 배치) 레이아웃은 유지(골격 유지, 스타일만 개선)  
- 컬러: 블랙/레드 기반이되 **기본 레드(brand-red)는 반드시 `#d32c2b`를 사용**한다(다른 빨강으로 임의 변경 금지).  
- `#d32c2b`는 **강조색** 에만 제한적으로 사용하고, 넓은 면적 배경 채우기 금지(레드 배경 카드/레드 섹션 금지).
- 에러 같은 경고 문구 표시를 위한 빨강색은 #d32c2b과 다른 색상을 사용해서 에러의 레드와 메인컬러의 레드를 구분하도록
- 아이콘 남발 금지: 의미 전달 목적 외 사용 금지, NavigationBar는 타이포그래 중심  
- 카드만 반복하는 UI 금지: 섹션/리스트/스티키 툴바/탭/설정 행(row) 등으로 구조적 다양성 확보  
- 애니메이션은 짧고 기능적(피드백/전환/상태), 과한 바운스/패럴랙스 금지  

### 3) 도메인/데이터 제약(반드시 반영)
- 예약 목적: 합주실 예약  
- 하루 타임슬롯: 14개 (예: 09:00~09:50, 10:00~10:50 … 50분 단위)  
- 팀별 예약 제한: “주당 최대 2시간”, “하루 최대 1시간”이 기본값이며 AdminSettings에서 변경 가능  
- Admin 예약 생성은 시스템적으로 제한이 없을 수 있으나(관리 목적), 팀 예약 제한/정책은 UI에서 일관되게 안내/표시되어야 함  
- 팀 수는 유동적(대규모도 가능), 관리자 수는 최대 5명 정도(권한/감사 로그는 선택 사항으로 제안 가능)  

### 4) 페이지별 리디자인 요구사항

#### A) TeamDetailPage
- 기능: 비밀번호 변경, 팀명 변경, 내 팀 예약 확인/취소, 팀 탈퇴  
- 요구: 아래 3개 섹션을 명확히 구분하고, 카드 반복 대신 “설정 화면”다운 구조로 개선하라.  
- 팀 정보 변경 섹션: SettingsRow(라벨-설명-컨트롤), 인라인 검증/성공 안내, 보안 안내 문구  
- 예약 관리 섹션: 카드 대신 리스트 행(row) 기반(예약 날짜/시간/상태/취소 버튼), “취소 가능/불가”를 색만으로 구분하지 말 것  
- 팀 탈퇴 섹션: Danger zone으로 분리(레드 면적 최소, 보더/텍스트 중심), 확인 모달 UX(2단 확인 또는 문구 입력) 제안  
- 산출물:  
- 섹션 와이어 설명 + 컴포넌트 설계(SectionHeader, SettingsRow, InlineAlert, DangerZone 등)  
- Tailwind/React 코드 스니펫 최소 3개  

#### B) AdminPage (멀티 생성 + 멀티 삭제/편집 모드 필수)
- 기능: 주차별 예약 현황, 팀 조회/삭제, 시스템 설정, 관리자 예약 생성  
- 요구 1) “여러 날짜/여러 시간대 동시 예약 생성”을 목표로 UX 재설계:  
- 멀티 선택 UI 대안 2가지 제시 후 1개 추천  
- 안1: 날짜(가로) × 시간(세로) 그리드에서 슬롯 토글 선택  
- 안2: 날짜 섹션별 time chip 다중 선택(선택 요약 패널 포함)  
- 선택 요약(선택 개수, 총 시간), 일괄 설명/메모 입력, 일괄 해제, 충돌/중복/불가 슬롯 표시  
- 검토 단계(Review) 또는 확인 모달, Undo(되돌리기) 제안  
- 팀별 정책(주당/일당 제한)이 설정돼 있다면, “제한 초과”를 사전에 경고하고 저장 불가/조건부 저장 전략을 제시  
- 요구 2) 팀 삭제/예약 삭제 “일괄 처리” UX:  
- 편집 버튼 → 다중 선택(체크박스) → 상단/하단 스티키 벌크 액션 바(삭제/선택 해제/전체 선택)  
- “전체 선택 / 부분 선택 / 선택 없음” 상태가 UI에 명확히 드러나야 함(툴바의 벌크 셀렉터 패턴처럼 동작)
- 산출물:  
- AdminReservations/AdminTeams/AdminSettings 정보 구조 개선안  
- 멀티 예약 생성 컴포넌트 설계(컴포넌트 이름, props, 상태 모델, 예시 타입 정의)  
- 벌크 편집 모드 컴포넌트 설계(BulkActionBar, SelectAllCheckbox, SelectedCountIndicator 등) + 코드 스니펫 최소 3개  

#### C) ReservationPageLayout (구조 유지 + 탭 전환 추가)
- 현재: 주차 예약 페이지, TimeslotList 세로 나열, 왼쪽 노선도 메타포 유지  
- 개선:  
- TimeSlot “스타일”을 세련되게(표면/타이포/상태/간격), 레이아웃 골격은 그대로  
- “미리 예약/바로 예약” 전환을 상단 탭/세그먼트로도 이동 가능하게(드롭다운은 보조로 격하하거나 제거)  
- 날짜 선택(월~일 한 행)은 오늘/선택/불가 상태를 색만으로 표현하지 말고 배지/텍스트/보더 중심으로  
- 로딩 스켈레톤/빈 상태/오류 상태를 EmptyState로 통일감 있게 개선  
- 산출물:  
- WeekSelector(요일 한 행) + 상단 탭(미리/바로) + TimeSlot 스타일 개선 코드 스니펫 최소 2개  
- 노선도(circle/bar) 두께/색/상태 변화 규칙(과한 장식 없이)  

### 5) 디자인 시스템 산출물(필수)
- 컬러 토큰: bg/surface/elevated/text/text-muted/border/**brand-red(#d32c2b)**/accent-1/accent-2/success/warn/danger  
- 레드(brand-red = #d32c2b) 사용 규칙(CTA/선택/에러/위험 영역에만)  
- 서브 포인트 컬러 1–2개 제안(레드와 충돌하지 않는 방향)  
- 타이포 스케일(모바일 기준), 라인하이트, 라운딩, 그림자(또는 보더), 스페이싱 규칙  
- Tailwind 적용: tailwind.config 확장 또는 CSS 변수 기반 중 하나는 반드시 코드로 제시  

### 6) 아이콘(@phosphor-icons/react) 정책(필수)
- Nav는 텍스트 중심, 아이콘은 “의미 전달 필요할 때만” 최소로  
- 아이콘 weight/size 규칙 제시(예: 16/20/24, regular 위주 + 위험 액션에만 bold 등)  
- 교체 예시 최소 3개: phosphor 개별 import 방식으로 제시

### 7) 출력 형식(반드시 이 순서)
- 전체 리디자인 전략(짧게)  
- 디자인 토큰 + 사용 규칙  
- common 컴포넌트 개선안(특히 Card 역할 재정의: 모든 UI를 카드로 감싸지 않게)  
- 페이지별 와이어/구조 설명(TeamDetail, Admin, Reservation)  
- 코드 스니펫 최소 10개(React + Tailwind + phosphor)  
- 모션 규칙 + motion-safe/motion-reduce 예시 코드
- 실패 방지 체크리스트(레드 과사용/아이콘 남발/카드 일변도/모바일 우선/접근성)  
