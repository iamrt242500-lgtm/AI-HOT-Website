# Pulse Frontend

Next.js 14 기반 모바일 중심 Revenue Dashboard UI

## 🎯 주요 기능

- **모바일 앱 UI**: 최대 너비 430px, iPhone 크기 최적화
- **Bottom Tab Navigation**: Home, Pages, Actions, Settings
- **Dark Mode**: 자동 다크 모드 지원
- **Health Check**: Backend API 연결 상태 확인

## 🚀 시작하기

### 의존성 설치

```bash
npm install
```

### 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일에서 다음 변수를 설정:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인할 수 있습니다.

### 프로덕션 빌드

```bash
npm run build
npm start
```

## 📁 프로젝트 구조

```
frontend/
├── app/
│   ├── (auth)/              # 인증 관련 라우트
│   │   └── login/
│   ├── (app)/               # 메인 앱 라우트
│   │   ├── home/           # 대시보드 홈
│   │   ├── pages/          # Top Revenue Pages
│   │   ├── actions/        # AI 액션 추천
│   │   └── settings/       # 설정
│   ├── layout.tsx          # 루트 레이아웃
│   ├── page.tsx            # 메인 페이지 (리다이렉트)
│   └── globals.css         # 전역 스타일
│
├── components/
│   ├── ui/                 # 재사용 UI 컴포넌트
│   └── layout/
│       └── BottomTabBar.tsx  # 하단 탭 네비게이션
│
├── lib/                    # 유틸리티 함수
├── public/                 # 정적 파일
└── package.json
```

## 🎨 디자인 시스템

### Tailwind 커스텀 색상

```typescript
colors: {
  primary: '#1392ec',
  'background-light': '#f6f7f8',
  'background-dark': '#101a22',
  'card-dark': '#162530',
  'border-dark': '#1e2e3b',
}
```

### 폰트

- **Primary**: Inter (Google Fonts)
- **Icons**: Material Icons Round

### 유틸리티 클래스

- `.hide-scrollbar`: 스크롤바 숨김
- `.ios-blur`: iOS 스타일 blur 효과
- `.glass-card`: Glass morphism 카드

## 📱 라우트 구조

| 라우트 | 설명 | 상태 |
|--------|------|------|
| `/` | 메인 (리다이렉트) | ✅ |
| `/home` | 대시보드 홈 + Health Check | ✅ |
| `/pages` | Top Revenue Pages | ✅(placeholder) |
| `/actions` | AI 액션 추천 | ✅(placeholder) |
| `/settings` | 설정 | ✅(placeholder) |
| `/login` | 로그인 | ✅ |
| `/onboarding/step1` | 사이트 등록 | ✅ |
| `/onboarding/step2` | GA4 연결(Mock) | ✅ |
| `/onboarding/step3` | AdSense 연결(Mock) | ✅ |

## 🛠️ 사용된 라이브러리

- `next`: 14.1.0
- `react`: 18.2.0
- `tailwindcss`: 3.4.1
- `typescript`: 5.3.3

## 📝 개발 가이드

### 새 페이지 추가

1. `app/(app)/` 아래에 폴더 생성
2. `page.tsx` 파일 생성
3. 필요 시 `BottomTabBar`에 탭 추가

### 새 컴포넌트 추가

1. `components/ui/` 또는 `components/layout/`에 생성
2. TypeScript + Tailwind 사용
3. "use client" 필요 시 명시

### API 호출

```typescript
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/endpoint`);
const data = await response.json();
```

## 🔧 스크립트

- `npm run dev`: 개발 서버 실행
- `npm run build`: 프로덕션 빌드
- `npm start`: 프로덕션 서버 실행
- `npm run lint`: ESLint 실행

## 📖 참고 문서

- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Material Icons](https://fonts.google.com/icons)
