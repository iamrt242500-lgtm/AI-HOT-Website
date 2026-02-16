# Pulse (앱 버전) - VS Code + Claude Opus 개발 프롬프트 세트 (Refactored)

아래 문서는 Claude Opus에 순차적으로 붙여넣어 Pulse MVP를 구현하기 위한 프롬프트 모음입니다.
각 프롬프트는 `---` 로 구분되어 있으며, 반드시 `SYSTEM -> TASK 1 -> TASK 18` 순서로 진행합니다.

## 0) 이번 리팩토링에서 반영한 핵심 수정 사항

- 문서 시작부의 불필요한 프론트매터 스타일 구분선 제거
- 모든 Task 출력 형식을 공통 템플릿으로 통일
- API 공통 규약 추가:
  - `api/v1` 버전 prefix
  - 표준 에러 스키마
  - 페이징 규약(`page`, `limit`, `total`)
- `site_id` 권한 검증 명시(다른 사용자 데이터 접근 차단)
- 날짜/집계 기준을 UTC 일간 집계로 고정
- `pages/top` API에 페이징 요구사항 명시
- `pages/detail`의 `page_url` 전달 시 URL 인코딩 문제를 피하기 위해 `page_key`(hash/id) 사용 권장
- KPI 정의 명확화(`users`, `pageviews`, `revenue`, `rpm`, `ctr`)
- 테스트/완료 기준(DoD) 명시로 구현 완료 판단 기준 통일
- 배포 Task에 헬스체크/롤백/환경변수 검증 체크리스트 추가

---

## [CLAUDE OPUS / SYSTEM] (프로젝트 시작 시 1회)

당신은 시니어 풀스택 엔지니어다.
목표는 PRD(v1.0 Pulse)를 기반으로, 1인 개발자가 운영 가능한 모바일 중심 MVP를 구현하는 것이다.

### 제품 정의

- 형태: 모바일 앱 UI (웹 기술 기반 구현 가능)
- 권장 스택:
  - Frontend: Next.js App Router + TypeScript
  - Backend: FastAPI + SQLAlchemy + Alembic
  - DB: Postgres
- 핵심 UX: 하단 탭 네비게이션 기반
- 핵심 가치: 복잡한 분석툴이 아니라 "수익 리포트 앱"
- 운영 시간 목표: 하루 30초~2분 내 상태 확인 가능

### MVP 범위

- Splash/Welcome
- Login
- Onboarding (사이트 등록 + GA4 연결 + AdSense 연결)
- Home (요약 KPI)
- Pages (수익 상위 페이지 리스트)
- Page Detail
- Actions (오늘의 액션)
- Settings

### 네비게이션

- 하단 탭 4개 고정:
  1. Home
  2. Pages
  3. Actions
  4. Settings

### 공통 아키텍처/보안 원칙

- MVP 범위 밖 기능은 구현하지 않는다.
- GA4/AdSense는 실제 OAuth/API 연동 전제를 유지하되, MVP에서는 Mock 모드 동작 허용.
- OAuth 토큰은 암호화 저장 전제로 설계한다.
- 데이터는 UTC 기준 일간 집계로 저장한다.
- 모든 조회 API는 `site_id` 소유권 검증을 수행한다.
- 1인 개발자가 유지보수 가능한 구조를 우선한다.
- 과도한 마이크로서비스/복잡한 이벤트 분석은 금지한다.

### API 공통 규약

- Prefix: `/api/v1`
- 성공 응답: `{"data": ..., "meta": ...}`
- 실패 응답: `{"error": {"code": "STRING_CODE", "message": "human readable", "details": {...}}}`
- 목록 API 기본 페이징:
  - query: `page`(기본 1), `limit`(기본 20, 최대 100)
  - meta: `page`, `limit`, `total`
- 날짜 범위 기본값: `range=7` (허용값은 Task에서 정의)

### 출력 방식(모든 Task 공통)

각 Task는 반드시 아래 형식으로 답한다.

- 목표
- 변경 파일 목록
- 구현 코드
- 실행 방법
- 확인 체크리스트

---

## [CLAUDE OPUS / TASK 1] 레포 초기 세팅 (모노레포)

### 목표

Pulse MVP 모노레포를 구성하고, 프론트-백엔드 기본 연결까지 완료한다.

### 구현 요구사항

- `frontend`: Next.js(App Router)
- `backend`: FastAPI
- `db`: Postgres (`docker-compose` 포함)
- 각 앱의 `.env.example` 작성
- 하단 탭 4개가 보이는 기본 앱 레이아웃 생성
- 백엔드 health check API 구현
- 프론트에서 health check 호출 상태 화면 구현

### 산출물

- 폴더 구조
- 실행 명령어
- backend health check API
- frontend health check 테스트 화면
- 앱 기본 레이아웃(Home/Pages/Actions/Settings)

### 완료 체크리스트

- `docker-compose up` 시 Postgres/Backend 실행
- 프론트에서 health status 확인 가능
- 하단 탭 4개 route 접근 가능

---

## [CLAUDE OPUS / TASK 2] 프론트 앱 레이아웃 (Bottom Tab Navigation)

### 목표

모바일 앱 형태의 공통 레이아웃을 완성한다.

### 구현 요구사항

- Next.js App Router route group 사용
- 탭 4개(Home/Pages/Actions/Settings)
- Safe Area 반영
- 하단 탭 고정, 본문 스크롤 영역 분리
- 탭 아이콘 적용(lucide-react 또는 SVG)

### 산출물

- 공통 레이아웃 코드
- 탭 컴포넌트
- 탭별 placeholder 페이지

### 완료 체크리스트

- 모바일 viewport에서 하단 탭 고정 유지
- 각 탭 전환 시 레이아웃 깨짐 없음

---

## [CLAUDE OPUS / TASK 3] 인증(Auth) - 개발용 세션 구현

### 목표

MVP 개발용 인증 플로우를 구현한다.

### 구현 요구사항

- 이메일 입력 후 로그인 성공(개발용 mock)
- JWT 또는 서버 세션 중 하나 선택해 일관되게 적용
- 보호 라우트:
  - 로그인 전 온보딩/앱 라우트 접근 차단
- 추후 Google OAuth 확장 가능한 구조로 분리

### 산출물

- Login 페이지(모바일 UI)
- 인증 API(간단)
- 인증 상태 저장/복원 로직
- 보호 라우트 또는 미들웨어

### 완료 체크리스트

- 비로그인 상태에서 보호 페이지 접근 시 `/login` 이동
- 로그인 후 새로고침해도 세션 유지

---

## [CLAUDE OPUS / TASK 4] DB 스키마 설계 + 마이그레이션

### 목표

Pulse MVP 핵심 스키마를 설계하고 마이그레이션을 구성한다.

### 구현 요구사항

- ORM: SQLAlchemy
- Alembic 초기 구성
- 필수 테이블:
  - `users`
  - `sites`
  - `connections` (provider: `ga4`, `adsense`)
  - `page_daily_metrics`
  - `revenue_daily_metrics`
  - `sync_jobs`
- `site_id` 기준 데이터 분리
- 주요 인덱스 추가:
  - `site_id + date`
  - `site_id + page_key + date`

### 산출물

- SQLAlchemy 모델
- Alembic 초기 migration
- docker-compose 환경에서 migration 적용 방법

### 완료 체크리스트

- 신규 DB에서 migration 1회로 스키마 생성
- 롤백/재적용 정상 동작

---

## [CLAUDE OPUS / TASK 5] 온보딩 1단계 - 사이트 등록 API + UI

### 목표

사이트 등록 스텝(1단계)을 완료한다.

### 구현 요구사항

- 사이트 생성 API
- 사이트 리스트 API
- 입력 유효성:
  - 사이트 이름 최소 길이
  - 도메인 형식 검증
- 프론트 stepper UI 및 다음 단계 이동 처리

### 산출물

- 사이트 API(create/list)
- 온보딩 1단계 UI
- 성공/실패 상태 처리

### 완료 체크리스트

- 유효하지 않은 도메인 입력 시 명확한 에러 노출
- 등록 성공 시 사이트가 리스트에 즉시 반영

---

## [CLAUDE OPUS / TASK 6] 온보딩 2단계 - GA4 연결(Mock)

### 목표

GA4 연결 Mock 플로우를 구현한다.

### 구현 요구사항

- 연결 버튼 클릭 시 `connections` 레코드 생성
- 더미 GA4 property 선택 UI
- 연결 완료 상태 표시

### 산출물

- connections API(create/read)
- 온보딩 2단계 UI
- DB 저장 확인 절차

### 완료 체크리스트

- 연결 후 새로고침해도 상태 유지
- 잘못된 site_id 접근 시 권한 에러 반환

---

## [CLAUDE OPUS / TASK 7] 온보딩 3단계 - AdSense 연결(Mock)

### 목표

AdSense 연결 Mock 플로우를 구현한다.

### 구현 요구사항

- 연결 버튼 클릭 시 `connections` 레코드 생성
- 더미 계정 선택 UI
- 연결 완료 상태 표시

### 산출물

- connections API 확장
- 온보딩 3단계 UI
- DB 저장 확인 절차

### 완료 체크리스트

- GA4/AdSense provider 구분 저장
- 중복 연결 처리 규칙(업서트 또는 중복 방지) 정의

---

## [CLAUDE OPUS / TASK 8] 더미 데이터 동기화 Job + 데이터 생성

### 목표

MVP 시연용 데이터 생성 파이프라인을 만든다.

### 구현 요구사항

- 사이트별 최근 30일 `page_daily_metrics` 생성
- 사이트별 최근 30일 `revenue_daily_metrics` 생성
- 페이지 URL 20~50개 랜덤 생성
- revenue와 pageviews 사이 약한 상관관계 부여
- 실행 방식 1개 이상 제공:
  - `/api/v1/dev/sync-dummy` endpoint
  - 또는 CLI 스크립트
- `sync_jobs` 로그 기록

### 산출물

- 더미 데이터 생성 코드
- 실행 방법
- DB 적재 확인 쿼리/절차

### 완료 체크리스트

- 동일 사이트에 재실행 시 중복 폭증 없음(덮어쓰기/업서트)
- Home/Pages API에서 즉시 활용 가능

---

## [CLAUDE OPUS / TASK 9] Home 화면 API 구현 (KPI)

### 목표

Home KPI API를 구현한다.

### 구현 요구사항

- Endpoint: `GET /api/v1/home/kpis?site_id=&range=7|30|90`
- 반환 KPI:
  - `users` (기간 내 unique users)
  - `pageviews` (합계)
  - `revenue` (합계)
  - `rpm` (`revenue / pageviews * 1000`, 0 division 방지)
  - `ctr` (더미 가능, nullable 허용)
- 최근 동기화 시간 포함

### 산출물

- FastAPI router
- Pydantic response schema
- 단위 테스트(최소 핵심 계산 로직)

### 완료 체크리스트

- `range` 유효성 검사 동작
- 빈 데이터에서도 500 없이 0값/nullable 응답

---

## [CLAUDE OPUS / TASK 10] Home 화면 UI 구현 (KPI 카드)

### 목표

Home 모바일 UI를 완성하고 KPI API를 연결한다.

### 구현 요구사항

- 사이트 선택 dropdown
- 기간 필터 segmented control(7/30/90)
- KPI 카드 2열 그리드
- 최근 동기화 시간 표시
- 로딩/에러/빈 상태 처리

### 산출물

- Home 페이지 UI
- API 연동 코드
- 상태별 UI 컴포넌트

### 완료 체크리스트

- 사이트/기간 변경 시 데이터 재조회 정상
- 모바일 스크린에서 카드 overflow 없음

---

## [CLAUDE OPUS / TASK 11] Pages 리스트 API 구현 (Top Revenue Pages)

### 목표

Pages 탭 목록 API를 구현한다.

### 구현 요구사항

- Endpoint:
  - `GET /api/v1/pages/top?site_id=&range=7|30|90&search=&sort=revenue|rpm|pageviews&page=1&limit=20`
- 기본 정렬: `revenue desc`
- `search`: URL 부분 문자열 매칭
- 반환 필드:
  - `page_key` (detail 조회용 식별자)
  - `page_url`
  - `pageviews`
  - `revenue`
  - `rpm`
  - `trend_percent`

### 산출물

- pages router
- 목록 응답 스키마 + meta(page/limit/total)
- 필터/정렬 쿼리 로직

### 완료 체크리스트

- 페이징/정렬/검색 조합 시 일관된 결과
- 대량 데이터에서도 응답 시간 악화 최소화(인덱스 활용)

---

## [CLAUDE OPUS / TASK 12] Pages 리스트 UI 구현 (모바일 리스트)

### 목표

Pages 탭 목록 UI를 구현하고 API를 연결한다.

### 구현 요구사항

- 검색 input
- 기간 필터(7/30/90)
- 정렬 옵션(Revenue/RPM/Pageviews)
- Row 구성:
  - URL(ellipsis)
  - Revenue
  - RPM
  - Trend chip
- Row 클릭 시 Page Detail 이동
- 로딩 skeleton / 빈 결과 / 에러 상태 구현

### 산출물

- Pages 화면 UI
- API 연동 + query state 관리
- 기본 페이징 UI(Load more 또는 pagination)

### 완료 체크리스트

- 검색어/정렬/기간 상태가 URL query에 반영
- 페이지 이동 후 뒤로가기 시 상태 복원

---

## [CLAUDE OPUS / TASK 13] Page Detail API 구현

### 목표

페이지 상세 데이터를 제공하는 API를 구현한다.

### 구현 요구사항

- Endpoint:
  - `GET /api/v1/pages/detail?site_id=&page_key=&range=7|30|90`
- 반환 데이터:
  - `page_key`
  - `page_url`
  - `revenue_trend: [{date, value}]`
  - `pageviews_trend: [{date, value}]`
  - `channel_summary` (더미 가능)
  - `rpm_summary`
  - `page_actions` (룰 기반 2개)

### 산출물

- detail router
- response schema
- trend 집계 로직

### 완료 체크리스트

- 없는 `page_key` 요청 시 404
- `range`별 시계열 길이 일관성 보장

---

## [CLAUDE OPUS / TASK 14] Page Detail UI 구현

### 목표

Page Detail 모바일 UI를 구현하고 detail API를 연결한다.

### 구현 요구사항

- 상단: URL + 뒤로가기
- 그래프 2개(Revenue/Pageviews)
- 채널 요약 카드
- RPM 카드
- 추천 액션 카드 2개
- 차트 라이브러리는 가벼운 패키지 선택

### 산출물

- Page Detail 화면 UI
- 차트 컴포넌트
- API 연동/상태 처리

### 완료 체크리스트

- 로딩/에러/빈 데이터 상태 분리
- 모바일 화면에서 차트 가독성 확보

---

## [CLAUDE OPUS / TASK 15] Actions API 구현 (룰 기반)

### 목표

Actions 탭 API를 구현한다.

### 구현 요구사항

- Endpoint: `GET /api/v1/actions?site_id=&range=7|30|90`
- 룰 예시:
  - RPM 높고 트래픽 낮음 -> "메인 노출 후보"
  - 트래픽 높고 RPM 낮음 -> "광고/콘텐츠 개선 후보"
  - 최근 급상승 페이지 -> "관련 글 추가 추천"
- 반환 필드:
  - `action_id`
  - `title`
  - `reason`
  - `target_page_key` (optional)
  - `target_page_url` (optional)
  - `priority` (1~3)

### 산출물

- actions router
- 룰 기반 생성 로직
- response schema

### 완료 체크리스트

- 동일 입력에서 결과 일관성 유지
- 빈 데이터에서도 기본 액션 또는 빈 리스트 정책 명확화

---

## [CLAUDE OPUS / TASK 16] Actions UI 구현

### 목표

Actions 탭 UI를 구현하고 API를 연결한다.

### 구현 요구사항

- 액션 리스트 3개 이상 표시
- priority 표시
- 클릭 시 상세 모달 또는 상세 페이지
- "완료 처리" 버튼 제공(로컬 상태만, DB 저장 제외)

### 산출물

- Actions 화면 UI
- API 연동
- 완료 처리 로컬 상태 로직

### 완료 체크리스트

- 완료 처리 후 UI 즉시 반영
- 새로고침 시 로컬 상태 초기화 정책 명확

---

## [CLAUDE OPUS / TASK 17] Settings API + UI 구현

### 목표

Settings 화면 및 관련 API를 구현한다.

### 구현 요구사항

- 연결 계정 목록(GA4/AdSense)
- 연결 해제 버튼
- 동기화 주기 표시(기본 매일 1회)
- 주간 리포트 이메일 토글(발송 기능은 MVP 제외 가능)
- 사이트 삭제(위험 경고 + 확인 단계)

### 산출물

- Settings API(read/update 일부)
- Settings UI
- 위험 작업 확인 모달

### 완료 체크리스트

- 연결 해제 후 상태 즉시 반영
- 사이트 삭제 시 연관 데이터 처리 정책 명시(soft delete 권장)

---

## [CLAUDE OPUS / TASK 18] 배포 준비 (MVP)

### 목표

배포 가능한 최소 구성을 완성한다.

### 구현 요구사항

- 환경변수 정리(`.env.example` 최신화)
- CORS 설정
- Dockerfile(frontend/backend)
- README 배포 가이드
- 로컬 원커맨드 실행 방법 제공
- PWA 옵션(가능하면):
  - manifest
  - icon placeholder
  - install 안내

### 산출물

- `docker-compose.prod` 또는 배포 문서
- 배포 체크리스트
- 헬스체크 확인 절차

### 완료 체크리스트

- 프로덕션 모드 기동 확인
- 기본 라우트/핵심 API 헬스체크 통과
- 롤백 방법(이전 이미지/버전) 문서화

