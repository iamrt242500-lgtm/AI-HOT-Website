# AI/IT News Aggregation Backend

AI·IT 최신 소식을 Instagram, Facebook, X(Twitter), Reddit, Medium 등 SNS/미디어에서 자동으로 수집·요약·저장하고, REST API로 제공하는 백엔드 시스템입니다.

## Features

- 🔄 **자동 뉴스 수집**: 5분마다 여러 플랫폼에서 자동으로 최신 뉴스 수집
- 🤖 **AI 요약**: OpenAI GPT-4를 사용한 자동 뉴스 요약 및 태그 추출
- 🚀 **고성능**: Redis 캐싱으로 빠른 응답 속도 (100ms 이하 목표)
- 🔐 **보안**: JWT 기반 인증 시스템
- 📊 **추천 알고리즘**: 사용자 관심사 기반 개인화 추천
- 🐳 **Docker**: 손쉬운 배포를 위한 컨테이너화

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **AI**: OpenAI GPT-4
- **Authentication**: JWT + bcrypt
- **Scheduler**: node-cron

## Prerequisites

- Node.js 18 이상
- Docker & Docker Compose (권장)
- PostgreSQL 15 (Docker 사용 시 불필요)
- Redis 7 (Docker 사용 시 불필요)

## API Keys Required

다음 API 키들이 필요합니다:

- **OpenAI API Key**: AI 요약 기능용
- **X (Twitter) API**: 트위터 뉴스 수집용
- **Reddit API**: Reddit 뉴스 수집용
- **Facebook Graph API** (선택): Facebook 뉴스 수집용
- **Instagram API** (선택): Instagram 뉴스 수집용

## Installation

### Option 1: Docker (권장)

```bash
# 1. 저장소 클론 또는 이동
cd /Users/a/Downloads/stitch_home_main_feed/backend

# 2. 환경변수 설정
cp .env.example .env
# .env 파일을 열어서 실제 API 키들을 입력하세요

# 3. Docker Compose로 실행
docker-compose up -d

# 4. 데이터베이스 마이그레이션 (처음 실행 시)
docker-compose exec backend npm run db:migrate
```

### Option 2: 로컬 설치

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env
# .env 파일을 열어서 필요한 값들을 입력하세요

# 3. PostgreSQL과 Redis가 실행 중인지 확인
# PostgreSQL: localhost:5432
# Redis: localhost:6379

# 4. 데이터베이스 마이그레이션
npm run db:migrate

# 5. 서버 시작
npm run dev  # 개발 모드
# 또는
npm start    # 프로덕션 모드
```

## Environment Variables

`.env` 파일에 다음 환경변수들을 설정하세요:

```env
# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/ai_news_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=7d

# OpenAI
OPENAI_API_KEY=sk-your-api-key-here

# X (Twitter)
X_API_KEY=your_key
X_API_SECRET=your_secret
X_BEARER_TOKEN=your_bearer_token

# Reddit
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret

# Facebook (선택)
FACEBOOK_ACCESS_TOKEN=your_token

# Instagram (선택)
INSTAGRAM_SESSION_ID=your_session_id
```

## API Endpoints

모든 API는 `http://localhost:3001/api` 에서 시작합니다.

### News Endpoints

- `GET /api/news/latest` - 최신 뉴스 목록
- `GET /api/news/trending` - 트렌딩 뉴스
- `GET /api/news/search?keyword=AI` - 키워드 검색
- `GET /api/news/:id` - 뉴스 상세
- `GET /api/news/source/:source` - 소스별 뉴스
- `POST /api/news/:id/click` - 클릭 추적

### User Endpoints

- `POST /api/user/register` - 회원가입
- `POST /api/user/login` - 로그인
- `POST /api/user/save` - 뉴스 저장/해제 (인증 필요)
- `GET /api/user/saved` - 저장된 뉴스 (인증 필요)
- `GET /api/user/recommend` - 개인화 추천 (인증 필요)
- `PUT /api/user/interests` - 관심사 업데이트 (인증 필요)
- `GET /api/user/profile` - 프로필 조회 (인증 필요)

### Trend Endpoints

- `GET /api/trend/keywords` - 트렌딩 키워드
- `GET /api/trend/topics` - Hot Topics
- `GET /api/trend/stats` - 통계

자세한 API 문서는 [API_DOCS.md](./API_DOCS.md)를 참조하세요.

## Manual News Collection

뉴스는 자동으로 5분마다 수집되지만, 수동으로 실행할 수도 있습니다:

```bash
# 로컬 실행
npm run collect

# Docker
docker-compose exec backend npm run collect
```

## Project Structure

```
backend/
├── server.js              # Express 서버 진입점
├── package.json           # 의존성 관리
├── .env.example          # 환경변수 템플릿
├── Dockerfile            # Docker 이미지 설정
├── docker-compose.yml    # Docker Compose 설정
├── db/
│   ├── index.js          # DB 연결 관리
│   ├── schema.sql        # DB 스키마
│   └── migrate.js        # 마이그레이션 스크립트
├── routes/
│   ├── news.js           # 뉴스 API 라우트
│   ├── user.js           # 사용자 API 라우트
│   └── trend.js          # 트렌드 API 라우트
├── collectors/
│   ├── xCollector.js     # X (Twitter) 수집기
│   ├── mediumCollector.js    # Medium 수집기
│   ├── redditCollector.js    # Reddit 수집기
│   ├── facebookCollector.js  # Facebook 수집기
│   └── instagramCollector.js # Instagram 수집기
├── workers/
│   └── newsCollector.js  # 메인 수집 워커
├── services/
│   ├── cache.js          # Redis 캐싱
│   ├── summarizer.js     # AI 요약 서비스
│   └── recommendation.js # 추천 알고리즘
├── middleware/
│   └── auth.js           # JWT 인증
├── utils/
│   └── deduplication.js  # 중복 제거
└── scheduler/
    └── index.js          # Cron 스케줄러
```

## Troubleshooting

### Database Connection Error

PostgreSQL이 실행 중인지 확인하세요:
```bash
# Docker
docker-compose ps

# 로컬
pg_isready
```

### Redis Connection Error

Redis가 실행 중인지 확인하세요:
```bash
# Docker
docker-compose ps

# 로컬
redis-cli ping
```

### OpenAI API Error

- API 키가 올바른지 확인하세요
- 계정에 크레딧이 있는지 확인하세요
- 요약 기능은 실패 시 자동으로 폴백됩니다

### No News Collected

- 각 플랫폼의 API 키가 올바르게 설정되었는지 확인하세요
- 네트워크 연결을 확인하세요
- 로그를 확인하세요: `docker-compose logs -f backend`

## License

MIT
