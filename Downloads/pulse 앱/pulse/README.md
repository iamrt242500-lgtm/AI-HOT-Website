# 🚀 Pulse - Revenue Dashboard MVP

**Professional Revenue Dashboard for Ad-driven Sites**

Pulse는 GA4와 AdSense를 연동하여 광고 수익을 실시간으로 모니터링하고, AI 기반 액션을 추천하는 모바일 중심의 대시보드 앱입니다.

---

## 📋 프로젝트 구조

```
pulse/
├── frontend/           # Next.js 14 (App Router) - 모바일 UI
│   ├── app/
│   │   ├── (auth)/    # 인증 관련 페이지
│   │   ├── (app)/     # 메인 앱 페이지 (하단 탭)
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/        # 재사용 UI 컴포넌트
│   │   └── layout/    # BottomTabBar 등 레이아웃
│   └── lib/           # 유틸리티 함수
│
├── backend/           # FastAPI - REST API 서버
│   ├── app/
│   │   ├── main.py           # FastAPI 진입점
│   │   ├── routers/          # API 라우터
│   │   ├── models/           # SQLAlchemy 모델
│   │   └── schemas/          # Pydantic 스키마
│   └── requirements.txt
│
├── docs/              # 프로젝트 문서
│   ├── PULSE_APP_DEVELOPMENT_PROMPTS.md
│   └── ANALYSIS_AND_TASK0.md
│
├── docker-compose.yml # Docker 컨테이너 구성
└── README.md         # 이 파일
```

---

## 🎯 MVP 주요 기능

### ✅ 구현된 기능 (Task 1-18)
- [x] 모노레포 구조 (Frontend + Backend)
- [x] FastAPI 기본 구조 + Health Check API
- [x] Next.js 14 App Router 설정
- [x] Tailwind CSS 디자인 시스템
- [x] 하단 탭 네비게이션 (4개: Home, Pages, Actions, Settings)
- [x] Docker Compose (Postgres 포함)
- [x] 환경 변수 템플릿
- [x] 개발용 JWT 로그인/세션
- [x] 온보딩 플로우 (사이트 등록, GA4/AdSense 연결 Mock)
- [x] 사이트/연결 API
- [x] SQLAlchemy 모델 + Alembic 초기 마이그레이션
- [x] 더미 데이터 생성 API
- [x] Home KPI 대시보드 API + UI (Revenue, Users, Pageviews, RPM)
- [x] Top Revenue Pages 리스트 API + UI (정렬/검색/페이지네이션)
- [x] Page Detail 분석 API + UI (차트, 채널 분석, RPM)
- [x] AI 기반 규칙 액션 추천 API + UI (우선순위, 완료 처리)
- [x] 설정 UI (연결 관리, 동기화 표시, 주간 리포트 토글, 사이트 삭제)
- [x] Production 배포 준비 (Dockerfiles, docker-compose.prod, PWA)

---

## 🚀 Quick Start

### 사전 요구사항
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (선택사항)

### 1. Backend 실행

```bash
# 1) 의존성 설치
cd backend
pip install -r requirements.txt

# 2) 환경 변수 설정
cp .env.example .env

# 3) 개발 서버 실행
python app/main.py
```

Backend API는 `http://localhost:8000` 에서 실행됩니다.
- Swagger UI: http://localhost:8000/api/docs
- Health Check: http://localhost:8000/api/v1/health

### 2. Frontend 실행

```bash
# 1) 의존성 설치
cd frontend
npm install

# 2) 환경 변수 설정
cp .env.example .env

# 3) 개발 서버 실행
npm run dev
```

Frontend는 `http://localhost:3000` 에서 실행됩니다.

### 3. Docker Compose로 전체 실행 (권장 — 개발)

```bash
# 프로젝트 루트에서
docker compose up -d

# 로그 확인
docker compose logs -f

# 중지
docker compose down
```

### 4. 프로덕션 배포 (한 번에 실행)

```bash
# 1) 환경 변수 파일 준비
cp .env.example .env
# .env 를 열어 SECRET_KEY, POSTGRES_PASSWORD 등을 수정

# 2) 프로덕션 빌드 & 실행
docker compose -f docker-compose.prod.yml up --build -d

# 3) 상태 확인
docker compose -f docker-compose.prod.yml ps

# 4) 로그 확인
docker compose -f docker-compose.prod.yml logs -f

# 5) 중지
docker compose -f docker-compose.prod.yml down
```

서비스 접속:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/api/docs

### 5. PWA 설치
- Chrome 브라우저에서 `http://localhost:3000` 접속
- 주소창 우측의 **"설치"** 버튼 또는 메뉴 → "앱 설치" 클릭
- 모바일에서는 "홈 화면에 추가" 사용

---

## 🎨 디자인 시스템

### 색상 팔레트
- **Primary**: `#1392ec` (파란색)
- **Background Light**: `#f6f7f8`
- **Background Dark**: `#101a22`
- **Card Dark**: `#162530`
- **Border Dark**: `#1e2e3b`

### 타이포그래피
- **Font Family**: Inter (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700

### UI 패턴
- **Glass Morphism**: Backdrop blur + 반투명 배경
- **Dark Mode**: Tailwind의 `dark:` prefix
- **Mobile First**: 최대 너비 430px (iPhone 크기)
- **Bottom Tab Bar**: 고정 하단 네비게이션 (4개 탭)

---

## 🛠️ 기술 스택

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Material Icons Round
- **Fonts**: Inter (Google Fonts)

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.11
- **ORM**: SQLAlchemy
- **Migration**: Alembic
- **Database**: PostgreSQL 15
- **Auth**: JWT (python-jose)

### DevOps
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Version Control**: Git

---

## 📖 API 문서

### Health Check
```
GET /api/v1/health
Response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00",
  "service": "Pulse API",
  "version": "1.0.0"
}
```

### Database Health
```
GET /api/v1/health/db
Response:
{
  "status": "healthy",
  "database": "postgresql",
  "connected": true
}
```

추가 엔드포인트(auth/sites/connections)는 현재 구현되어 있으며, KPI/Pages/Actions 세부 기능은 Task 8 이후에서 확장됩니다.

---

## 📝 개발 가이드

### Branch 전략
- `main`: Production 배포 브랜치
- `develop`: 개발 브랜치
- `feature/*`: 기능 개발 브랜치
- `fix/*`: 버그 수정 브랜치

### Commit 메시지 규칙
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 코드
chore: 빌드/설정 변경
```

### 코드 스타일
- **Python**: PEP 8 + Black formatter
- **TypeScript**: ESLint + Prettier
- **React**: Functional Components + Hooks

---

## 🧪 테스트

### Backend
```bash
cd backend
pytest
```

### Frontend
```bash
cd frontend
npm test
```

---

## 📦 배포

### Production 한 줄 실행
```bash
cp .env.example .env && docker compose -f docker-compose.prod.yml up --build -d
```

### 환경 변수 정리

| 변수명 | 용도 | 기본값 | 필수 |
|--------|------|--------|------|
| `POSTGRES_DB` | DB 이름 | `pulse_db` | ✅ |
| `POSTGRES_USER` | DB 사용자 | `pulse_user` | ✅ |
| `POSTGRES_PASSWORD` | DB 비밀번호 | `pulse_password` | ✅ (변경!) |
| `SECRET_KEY` | JWT 시크릿 키 | — | ✅ (변경!) |
| `FRONTEND_URL` | CORS 허용 오리진 | `http://localhost:3000` | ✅ |
| `NEXT_PUBLIC_API_URL` | 프론트→백엔드 URL | `http://localhost:8000` | ✅ |
| `API_PORT` | 백엔드 포트 | `8000` | |
| `FRONTEND_PORT` | 프론트엔드 포트 | `3000` | |

### CORS 설정
백엔드 `FRONTEND_URL` 환경 변수에 쉼표로 구분된 오리진 목록을 설정합니다:
```
FRONTEND_URL=https://pulse.example.com,http://localhost:3000
```

### Docker 이미지 개별 빌드

**Backend**:
```bash
cd backend
docker build -t pulse-backend .
```

**Frontend**:
```bash
cd frontend
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com -t pulse-frontend .
```

---

## 🗂️ 참고 문서

- [개발 프롬프트 가이드](./docs/PULSE_APP_DEVELOPMENT_PROMPTS.md)
- [HTML 분석 및 Task 0](./docs/ANALYSIS_AND_TASK0.md)
- [Backend API 문서](./backend/README.md)

---

## 📄 라이선스

MIT License

---

## 👥 기여자

- **Core MVP Build**: Task 0-18 완료 (2026)

---

## 🔗 관련 링크

- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
- [Next.js 공식 문서](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/)
- [Material Icons](https://fonts.google.com/icons)

---

**Made with ❤️ for Ad-driven Content Creators**
