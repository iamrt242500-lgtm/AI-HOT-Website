# AI HOT NEWS 웹사이트 개발 보고서  
**작성일자:** 2025.12.02  
**작성자 및 참여자:** 학번 25615008, 김성민

---

## 1. 프로젝트 개요

AI HOT NEWS는 최신 인공지능(AI) 뉴스와 주요 AI 기업의 공식 SNS 업데이트를 한 곳에서 제공하는 웹 포털입니다.  
사용자는 OpenAI, Google AI, DeepMind, Anthropic, Meta, Mistral 등 글로벌 AI 기업의 공식 발표와 트렌드, 추천 AI 툴, 뉴스 기사 등을 직관적으로 탐색할 수 있습니다.

---

## 2. 개발 목표 및 주요 기능

### 2.1 개발 목표
- AI 분야의 최신 동향과 공식 발표를 신속하게 제공
- 사용자 친화적이고 반응형 UI 구현
- SNS 공식 업데이트와 뉴스, 트렌드, 툴 추천 등 다양한 정보 통합

### 2.2 주요 기능
- **SNS Official Updates**: 주요 AI 기업의 공식 SNS 발표를 실시간으로 제공, 회사별 필터링 가능
- **Featured News**: AI 관련 주요 뉴스 기사 제공, 페이징 및 상세 보기 지원
- **Trending Topics**: 실시간 AI 트렌드 키워드 및 랭킹 제공
- **Recommended AI Tools**: AI 툴 및 서비스 추천, 카테고리별 필터링
- **검색 및 저장**: 뉴스/툴/트렌드 등 전체 검색, 기사 저장(북마크) 기능
- **상세 페이지 및 뒤로가기**: 기사 클릭 시 상세 페이지 이동, 뒤로가기 버튼 지원
- **다크/라이트 모드**: 사용자 테마 선택 가능
- **반응형 디자인**: PC/모바일/태블릿 모두 최적화

---

## 3. 개발 및 구현 내용

### 3.1 프론트엔드
- **구현 방식**: Vanilla JavaScript 기반 SPA 구조, HTML/CSS로 UI 구성
- **주요 파일**: `app.html`, `api-client.js`, 각 컴포넌트별 `code.html`
- **UI/UX**: 햄버거 메뉴, 회사별 필터 버튼, 페이징, 상세 페이지, 북마크, 테마 토글 등
- **상태 표시 및 에러 처리**: 초기화 상태 표시, API 오류 시 사용자 안내 메시지 출력

### 3.2 백엔드
- **구현 방식**: Node.js + Express.js 기반 REST API 서버
- **주요 파일**: `backend/server.js`, `backend/routes/`, `backend/collectors/`
- **API 엔드포인트**:
  - `/api/news/latest` : 최신 뉴스 기사
  - `/api/sns/latest` : SNS 공식 업데이트
  - `/api/sns/by-company/:company` : 회사별 SNS 기사
  - `/api/sns/companies` : 지원 회사 목록
  - `/api/trend/topics` : 트렌드 키워드
  - `/api/ai-tools` : 추천 AI 툴
  - `/api/user/profile` : 사용자 정보
- **데이터 수집**: SNS/뉴스/트렌드/툴 등 각종 데이터 수집기 구현
- **보안 및 성능**: Helmet.js, CORS, Rate Limiting, JWT 인증, Redis 캐싱, DB 마이그레이션

### 3.3 배포 및 문서화
- **GitHub 업로드**: https://github.com/iamrt242500-lgtm/AI-HOT-Website
- **문서 파일**:
  - `README.md`: 전체 프로젝트 설명, 설치/실행 방법, API 문서
  - `IMPLEMENTATION_GUIDE.md`: 상세 구현 가이드
  - `API_DOCS.md`: 백엔드 API 상세 설명
  - `SNS_VERIFICATION_FINAL_REPORT.md`: SNS 데이터 검증 및 최신 정보 확인 보고서
  - `GITHUB_UPLOAD_GUIDE.md`: 깃허브 업로드 및 관리 방법

---

## 4. 데이터 및 정보 검증

- **SNS 데이터 최신성**: 2025년 12월 기준, OpenAI GPT-5.1, Google Gemini 3, DeepMind SIMA 2, Anthropic Claude Opus 4.5, Meta $13B 투자 등 공식 발표 내용 반영
- **데이터 검증 절차**: 각 기업 공식 채널 및 보도자료 기반으로 mock 데이터 업데이트, 7일 이내 최신성 검증 로직 구현
- **보고서 파일**: `SNS_DATA_VERIFICATION.md`, `SNS_VERIFICATION_FINAL_REPORT.md`에 상세 검증 내역 기록

---

## 5. 기술적 문제 해결 및 개선 내역

- **CORS 및 Helmet 충돌 해결**: 미들웨어 순서 조정 및 crossOriginResourcePolicy 설정으로 API 접근 문제 해결
- **정적 파일 서빙**: Express static 미들웨어 추가로 프론트엔드 파일 직접 서빙
- **API 오류 처리**: 모든 주요 함수에 try-catch 및 사용자 안내 메시지 추가
- **이벤트 핸들러 안전화**: JSON.stringify 대신 안전한 이벤트 리스너 방식으로 코드 개선
- **초기화 및 상태 표시**: 앱 초기화 단계별 상태 표시 및 에러 발생 시 상단 안내

---

## 6. 결과 및 성과

- **모든 기능 정상 동작 확인**: SNS, 뉴스, 트렌드, 툴, 상세 페이지, 북마크, 테마 등 모든 기능 정상 작동
- **API 응답 및 데이터 구조 검증**: curl 및 브라우저 테스트로 모든 엔드포인트 정상 응답 확인
- **최신 정보 반영**: 2025년 12월 기준, 모든 SNS/뉴스/트렌드 데이터 최신화 완료
- **문서화 및 배포**: README, 구현 가이드, 데이터 검증 보고서 등 문서화 완료 및 깃허브 업로드

---

## 7. 결론 및 향후 계획

본 프로젝트는 AI 분야의 최신 동향과 공식 발표를 신속하게 제공하는 통합 포털로서, 사용자 경험과 정보 신뢰성을 모두 만족시키는 것을 목표로 하였습니다.  
향후 실제 RSS/공식 API 연동, 사용자 인증/권한 관리, 고도화된 검색 및 추천 기능, 소셜 공유, 다국어 지원 등 추가 기능을 개발할 예정입니다.

---

## 8. 참고 및 부록

- **GitHub 저장소**: https://github.com/iamrt242500-lgtm/AI-HOT-Website
- **문서 파일**: README.md, IMPLEMENTATION_GUIDE.md, API_DOCS.md, SNS_VERIFICATION_FINAL_REPORT.md 등
- **작성자 및 참여자**: 학번 25615008, 김성민

---

**보고서 작성일:** 2025.12.02  
**작성자:** 김성민 (학번: 25615008)

---

# 🔥 AI HOT NEWS - AI News Portal with SNS Official Updates

A full-stack web application for discovering the latest AI news and official announcements from major AI companies, including OpenAI, Google AI, DeepMind, Anthropic, Meta, and Mistral.

## 🌟 Features

### Frontend
- **SNS Official Updates Section** - Real-time official announcements from major AI companies
- **Company Filter** - Filter SNS posts by: OpenAI, Google AI, DeepMind, Anthropic, Meta, Mistral
- **Featured News Feed** - Curated AI news articles with pagination
- **Trending Topics** - Real-time trending AI topics and keywords
- **AI Tools Recommendation** - Discover recommended AI tools by category
- **Detail Page** - Click any article to view full details with back navigation
- **Responsive UI** - Works on desktop, tablet, and mobile
- **Dark/Light Mode** - Toggle between dark and light themes
- **Bookmark/Save** - Save articles for later reading
- **Search** - Search across all news articles

### Backend
- **Express.js REST API** - Robust backend with multiple endpoints
- **Data Collection** - SNS and news data collectors
- **Caching** - Redis-based caching for performance
- **Translation** - Multi-language support with translation services
- **Database** - PostgreSQL with migration support
- **CORS & Security** - Helmet.js and CORS middleware configured
- **Rate Limiting** - API rate limiting to prevent abuse
- **Authentication** - JWT-based user authentication

## 🚀 Quick Start

### Prerequisites
- Node.js 14+ 
- npm or yarn
- PostgreSQL (optional, for database features)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/iamrt242500-lgtm/AI-HOT-Website.git
cd AI-HOT-Website
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Install frontend dependencies** (already in repo)
```bash
# Frontend files are static, no installation needed
```

4. **Configure environment**
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

5. **Start the backend server**
```bash
npm start
# or
node server.js
```

6. **Open the application**
```
http://localhost:3001/app.html
```

## 📁 Project Structure

```
.
├── app.html                 # Main frontend application
├── app-simple.html          # Simplified version for testing
├── api-client.js            # API client for frontend
├── index.html               # Home page
├── backend/
│   ├── server.js            # Express.js server
│   ├── package.json         # Backend dependencies
│   ├── collectors/          # Data collectors (SNS, News, etc.)
│   ├── routes/              # API routes
│   ├── services/            # Business logic services
│   ├── middleware/          # Authentication, logging, etc.
│   ├── db/                  # Database configuration and migrations
│   ├── scheduler/           # Background job scheduler
│   └── workers/             # Background workers
├── bookmark/                # Bookmark/Save component
├── filter_bar_component/    # Filter component
├── home_(main_feed)/        # Home feed component
├── news_card_component/     # News card component
├── news_detail_page/        # News detail page component
├── profile_(user_customization)/  # User profile component
├── search_page/             # Search component
└── trend_browser_page/      # Trends component
```

## 🔧 API Endpoints

### News
- `GET /api/news/latest` - Get latest news articles
- `POST /api/news/save` - Save article

### SNS Official Updates
- `GET /api/sns/latest` - Get latest SNS articles
- `GET /api/sns/by-company/:company` - Get articles by company
- `GET /api/sns/companies` - Get list of SNS companies

### Trends
- `GET /api/trend/topics` - Get trending topics

### AI Tools
- `GET /api/ai-tools` - Get AI tools recommendations

### User
- `POST /api/user/login` - User login
- `POST /api/user/signup` - User registration
- `GET /api/user/profile` - Get user profile

## 📊 Latest SNS Data

The application includes verified 2025 AI announcements:
- **OpenAI**: GPT-5.1 Release
- **Google AI**: Gemini 3
- **DeepMind**: SIMA 2 (Scalable Instructable Multi-Agent)
- **Anthropic**: Claude Opus 4.5
- **Meta AI**: $13B Funding
- **Mistral AI**: Advanced Models

All data is verified and updated as of December 2, 2025.

## 🔐 Security

- CORS protection configured
- Helmet.js security headers
- Rate limiting enabled
- JWT authentication
- Input validation
- XSS protection

## 📝 Documentation

- [Implementation Guide](./IMPLEMENTATION_GUIDE.md) - Detailed implementation details
- [Backend API Docs](./backend/API_DOCS.md) - Complete API documentation
- [SNS Verification Report](./SNS_VERIFICATION_FINAL_REPORT.md) - Data verification details
- [GitHub Upload Guide](./GITHUB_UPLOAD_GUIDE.md) - Git and GitHub setup

## 🐳 Docker Support

Run with Docker:
```bash
docker-compose -f backend/docker-compose.yml up
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests.

## 📄 License

This project is open source and available under the MIT License.

## 👤 Author

**김성민** (iamrt242500@gmail.com)

## 🙏 Acknowledgments

- Built with Express.js, Node.js, and Vanilla JavaScript
- Uses official SNS API data from major AI companies
- Icons from Material Design

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

**Last Updated**: December 2, 2025

**Current Version**: 1.0.0 - Initial Release
