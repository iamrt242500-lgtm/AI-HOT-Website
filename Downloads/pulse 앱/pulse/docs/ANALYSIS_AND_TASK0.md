# Pulse App - HTML 분석 및 Task 0 실행

## HTML 코드 분석 결과

### 1. 전체 구조 개요
기존 HTML 파일들은 **Tailwind CSS**와 **Material Icons**를 활용한 모바일 우선 디자인으로 구성되어 있습니다.

### 2. 주요 화면별 분석

#### 2.1 Landing Page (`pulse_landing_page/code.html`)
- **구조**: 마케팅 랜딩 페이지
- **주요 요소**:
  - Hero Section (타이틀, CTA)
  - 가치 제안 카드 (수익 상위 페이지, RPM 최적화, 액션 추천)
  - 프리뷰 스크린샷
  - 가격 플랜 (Free, Pro)
  - Footer
- **디자인 특징**:
  - Glass morphism 효과 (`.glass-card`)
  - 다크모드 지원
  - Primary color: `#1392ec` (파란색)

#### 2.2 Login & Signup (`pulse_login_&_signup/code.html`)
- **구조**: 모바일 폼 팩터 로그인 화면
- **주요 요소**:
  - 로고 헤더
  - Google OAuth 버튼
  - 이메일 입력
  - OTP 6자리 입력 UI
  - 보안 disclaimer
- **디자인 특징**:
  - 최대 너비 400px (모바일 앱 느낌)
  - 세로로 긴 레이아웃
  - Safe area 고려

#### 2.3 Onboarding Stepper (`pulse_onboarding_stepper/code.html`)
- **구조**: 3단계 온보딩 프로세스
- **Step 구성**:
  - Step 1: Site Registration (사이트 이름, 도메인, 통화)
  - Step 2: GA4 연결 (참조용 hidden)
  - Step 3: AdSense 연결 (참조용 hidden)
- **주요 요소**:
  - Progress bar (3단계 표시)
  - 폼 입력 필드
  - 실시간 동기화 프리뷰 카드
  - 하단 고정 "Continue" 버튼
- **디자인 특징**:
  - Sticky header with iOS blur effect
  - 각 단계별 명확한 구분

#### 2.4 Dashboard Overview (`pulse_dashboard_overview/code.html`)
- **구조**: 메인 대시보드 (Home 화면)
- **주요 요소**:
  - 헤더 (사이트 선택 드롭다운, 알림 버튼)
  - 기간 필터 (7일/30일/90일) - Segmented Control
  - KPI 카드 그리드:
    - Estimated Revenue (2열 full width)
    - Users, Pageviews, RPM, CTR (2열 그리드)
  - Today Actions 리스트 (3개)
  - Top Revenue Pages 테이블
  - **Bottom Tab Navigation** (5개 탭)
- **디자인 특징**:
  - 카드 기반 레이아웃
  - Mini bar charts 내장
  - Trend indicators (%, 색상)
  - 하단 탭 고정 + safe area

#### 2.5 Page Insights Detail (`pulse_page_insights_detail/code.html`)
- **구조**: 페이지 상세 분석 화면
- **주요 요소**:
  - 네비게이션 헤더 (뒤로가기, 공유)
  - Page Hero (제목, URL, 복사 버튼)
  - KPI Summary (Revenue, Views, RPM) - 3열 그리드
  - 기간 필터 (7D/30D/90D)
  - Performance Trends (그래프 영역)
  - Traffic Channels 섹션
  - Recommended Actions 카드
- **디자인 특징**:
  - 상단 iOS status bar 공간
  - Sticky header
  - Trend chips (상승/하락)

#### 2.6 Design Components (`pulse_design_components/code.html`)
- **구조**: UI 컴포넌트 라이브러리 (참조용)
- **주요 요소**:
  - 검색바
  - 필터 버튼 (Pill 형태)
  - KPI 카드 Variations (3종)
  - 기타 재사용 가능 컴포넌트들
- **디자인 특징**:
  - Atomic design 접근
  - 다양한 카드 크기 변형

#### 2.7 App Settings (`pulse_app_settings/code.html`)
- **구조**: 설정 화면
- **주요 요소**:
  - iOS status bar
  - 네비게이션 헤더 (뒤로가기, Done)
  - 사이트 프로필 카드
  - Integrations 섹션:
    - GA4 연결 상태 (RE-SYNC 버튼)
    - AdSense 연결 상태
  - 기타 설정 옵션 영역
- **디자인 특징**:
  - 최대 너비 430px (iPhone 크기)
  - List 형태의 설정 항목들

### 3. 공통 디자인 시스템

#### 3.1 색상 팔레트
```javascript
colors: {
  "primary": "#1392ec",           // 메인 파란색
  "background-light": "#f6f7f8",  // 라이트 배경
  "background-dark": "#101a22",   // 다크 배경
  "card-dark": "#162530",         // 다크 카드
  "border-dark": "#1e2e3b",       // 다크 보더
}
```

#### 3.2 타이포그래피
- Font Family: `Inter` (sans-serif)
- Font Weights: 300, 400, 500, 600, 700

#### 3.3 Border Radius
- Default: `0.25rem`
- lg: `0.5rem`
- xl: `0.75rem`
- full: `9999px`

#### 3.4 주요 패턴
1. **Glass Morphism**: `backdrop-filter: blur(12px)` + 반투명 배경
2. **Dark Mode**: Tailwind의 `dark:` prefix 활용
3. **Safe Area**: iOS status bar를 위한 상단 공간 (44px ~ 48px)
4. **Bottom Tab Bar**: 고정 하단 네비게이션
5. **Sticky Headers**: 스크롤 시 고정되는 헤더
6. **Material Icons**: Google Material Icons Round/Outlined 사용

### 4. 네비게이션 구조

#### Bottom Tab Bar (Dashboard에서 확인)
현재 HTML에는 5개 탭이 있지만, PRD에서는 4개를 요구:
1. **Pulse** (Home/Dashboard) - 현재 활성
2. **Metrics** (Pages)
3. **(Add 버튼)** - 중앙 FAB
4. **Alerts** (Actions)
5. **Settings**

→ **Task 1에서 4개 탭으로 조정 필요**:
- Home
- Pages
- Actions
- Settings

### 5. 기술 스택 (HTML 기반)
- **CSS Framework**: Tailwind CSS (CDN)
- **Icons**: Material Icons + Material Symbols
- **Fonts**: Google Fonts (Inter)
- **특별 기능**:
  - Dark mode class switching
  - Responsive mobile-first
  - Container queries 지원

---

## Task 0 실행: 기존 HTML 분석 정리 및 MVP 범위 확정

### 목표
기존 HTML 프로토타입을 분석하고, Next.js + FastAPI 기반 MVP로 전환하기 위한 설계 방향을 확정합니다.

### 변환 전략

#### 1. 화면 매핑
| HTML 파일 | MVP 화면 | Next.js Route | 우선순위 |
|-----------|---------|---------------|---------|
| `pulse_landing_page` | Welcome/Splash | `/` | P2 (나중) |
| `pulse_login_&_signup` | Login | `/login` | P0 (필수) |
| `pulse_onboarding_stepper` | Onboarding | `/onboarding` | P0 (필수) |
| `pulse_dashboard_overview` | Home (KPI) | `/app/home` | P0 (필수) |
| `pulse_page_insights_detail` | Page Detail | `/app/pages/[id]` | P1 (중요) |
| `pulse_design_components` | (Component Library) | `components/` | P0 (참조) |
| `pulse_app_settings` | Settings | `/app/settings` | P1 (중요) |

#### 2. 컴포넌트 분해 계획

**공통 컴포넌트** (`components/ui/`):
- `Button.tsx` - 기본/Primary/Outline 버튼
- `Card.tsx` - KPI 카드 변형들
- `Input.tsx` - 폼 입력 필드
- `SegmentedControl.tsx` - 기간 필터 (7/30/90일)
- `BottomTabBar.tsx` - 하단 고정 탭 네비게이션
- `Badge.tsx` - Trend chips (+12%, -2.1% 등)
- `ProgressBar.tsx` - Onboarding stepper

**레이아웃 컴포넌트** (`components/layout/`):
- `AppLayout.tsx` - Bottom tab + safe area 포함
- `AuthLayout.tsx` - 로그인/온보딩 레이아웃
- `Header.tsx` - Sticky header with blur

**도메인 컴포넌트** (`components/domain/`):
- `KPICard.tsx` - Revenue/Users/Pageviews 등
- `ActionCard.tsx` - Today Actions 아이템
- `PageListItem.tsx` - Top Pages 테이블 row
- `ConnectionCard.tsx` - GA4/AdSense 연결 상태

#### 3. 디자인 시스템 → Tailwind Config

**`tailwind.config.ts` 설정**:
```typescript
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#1392ec',
        'background-light': '#f6f7f8',
        'background-dark': '#101a22',
        'card-dark': '#162530',
        'border-dark': '#1e2e3b',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
```

#### 4. 라우팅 구조 (Next.js App Router)

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   └── layout.tsx
├── onboarding/
│   ├── page.tsx           # Step router
│   ├── [step]/
│   │   └── page.tsx
│   └── layout.tsx
├── (app)/
│   ├── home/
│   │   └── page.tsx       # Dashboard
│   ├── pages/
│   │   ├── page.tsx       # Pages List
│   │   └── [id]/
│   │       └── page.tsx   # Page Detail
│   ├── actions/
│   │   └── page.tsx       # Actions List
│   ├── settings/
│   │   └── page.tsx
│   └── layout.tsx         # With BottomTabBar
├── layout.tsx             # Root layout
└── page.tsx               # Redirect to /app/home or /login
```

#### 5. MVP 기능 범위 확정

**✅ MVP에 포함**:
- [x] 로그인 (개발용 간단 인증)
- [x] 온보딩 3단계 (사이트 등록 + GA4/AdSense Mock 연결)
- [x] Home 화면 (KPI 카드: Revenue, Users, Pageviews, RPM, CTR)
- [x] Pages 리스트 (Top Revenue Pages)
- [x] Page Detail (상세 분석 + 추천 액션)
- [x] Actions 리스트 (룰 기반 3개 이상)
- [x] Settings (연결 관리, 사이트 삭제)
- [x] 하단 탭 네비게이션 (4개)
- [x] 더미 데이터 생성 Job
- [x] 다크모드 지원

**❌ MVP에서 제외**:
- [ ] 실제 GA4/AdSense OAuth 연동 (Task 18 이후)
- [ ] 실시간 동기화 (매일 1회 cron으로 대체)
- [ ] 주간 이메일 리포트 (토글만, 실제 발송 제외)
- [ ] 랜딩 페이지 (직접 /login으로 진입)
- [ ] 복잡한 그래프 (간단한 mini bar chart로 대체)
- [ ] 알림 시스템 (알림 탭 제거)

#### 6. 백엔드 API 엔드포인트 설계

**Auth**:
- `POST /api/v1/auth/login` - 개발용 로그인
- `GET /api/v1/auth/me` - 현재 사용자

**Sites**:
- `POST /api/sites` - 사이트 생성
- `GET /api/sites` - 사이트 목록
- `DELETE /api/sites/{site_id}` - 사이트 삭제

**Connections**:
- `POST /api/connections` - GA4/AdSense 연결 (Mock)
- `GET /api/connections?site_id=` - 연결 목록
- `DELETE /api/connections/{conn_id}` - 연결 해제

**Dashboard**:
- `GET /api/home/kpis?site_id=&range=7|30|90` - KPI 데이터

**Pages**:
- `GET /api/pages/top?site_id=&range=&search=&sort=` - 상위 페이지
- `GET /api/pages/detail?site_id=&page_url=&range=` - 페이지 상세

**Actions**:
- `GET /api/actions?site_id=&range=` - 추천 액션 목록

**Dev Tools**:
- `GET /api/v1/health` - Health check
- `POST /api/dev/sync-dummy` - 더미 데이터 생성

#### 7. 하단 탭 네비게이션 확정 (4개)

HTML에서는 5개였지만, MVP에서는 **4개로 단순화**:

| 아이콘 | 라벨 | Route | Material Icon |
|-------|------|-------|---------------|
| 📊 | Home | `/app/home` | `dashboard` |
| 📄 | Pages | `/app/pages` | `description` |
| ⚡ | Actions | `/app/actions` | `bolt` |
| ⚙️ | Settings | `/app/settings` | `settings` |

중앙 FAB (Add 버튼)는 제거 → 필요 시 각 화면에서 개별 추가

---

## 다음 단계: Task 1 준비

### Task 1에서 진행할 작업
1. 모노레포 폴더 구조 생성
2. `frontend/` - Next.js 14 App Router 초기화
3. `backend/` - FastAPI + SQLAlchemy 초기화
4. `docker-compose.yml` - Postgres 포함
5. Tailwind 설정 + Inter 폰트 + Material Icons 설정
6. 기본 레이아웃 (`BottomTabBar` 포함)
7. Health check API + 프론트 연결 테스트
8. `.env.example` 템플릿

### 산출물 체크리스트
- [ ] 폴더 구조 완성
- [ ] `npm run dev` (frontend)
- [ ] `uvicorn main:app --reload` (backend)
- [ ] `docker-compose up -d` (postgres)
- [ ] `/api/v1/health` 응답 확인
- [ ] 4개 탭 표시 확인 (placeholder 페이지)
- [ ] 다크모드 토글 작동

---

**분석 완료. Task 1 프롬프트 실행 준비 완료.**
