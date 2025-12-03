
---

# AI·IT 뉴스 큐레이션 플랫폼  
**Technical Report (최종본)**

---
개발자 및 보고서 작성자: 25615008 김성민
---


## 1. 개요 (Overview)

### 프로젝트 목적
- 최신 AI·IT 뉴스를 신속·정확하게 큐레이션하여, 사용자에게 맞춤형 정보와 프리미엄 기능(결제, 북마크, 알림 등)을 제공하는 통합 플랫폼 구축.

### 사용자 가치 정의
- **정보 신뢰성**: 검증된 뉴스만 제공, 링크 유효성 자동 검사.
- **개인화**: 북마크 폴더, 태그, 실시간 알림, 번역/요약 등 맞춤형 기능.
- **프리미엄 경험**: 결제 기반 고급 기능(무제한 북마크, 고급 검색, 뉴스레터 등).

### 주요 기능 요약
- AI 기반 뉴스 추천 및 검색(감정 분석, Boolean, 날짜 필터)
- 북마크/폴더/태그 관리
- 실시간 알림(Push), 이메일 뉴스레터
- PayPal 결제 및 구독 시스템
- 다국어(i18n), 라이트/다크 테마 지원

---

## 2. 시스템 아키텍처 (System Architecture)

### 전체 구조도 (ASCII Diagram)
```
+-------------------+      +-------------------+      +-------------------+
|   Frontend (SPA)  |<---->|   Backend (API)   |<---->|   Database (DB)   |
+-------------------+      +-------------------+      +-------------------+
        |                        |                          |
        v                        v                          v
+-------------------+      +-------------------+      +-------------------+
|  PayPal Checkout  |<---->| Webhook Listener  |<---->| PaymentLog Table  |
+-------------------+      +-------------------+      +-------------------+
        |                        |                          |
        v                        v                          v
+-------------------+      +-------------------+      +-------------------+
| Push/Email System |<---->| Notification API  |<---->| Notifications DB  |
+-------------------+      +-------------------+      +-------------------+
```

### 시스템 흐름 요약
- **Frontend**: SPA, 사용자 인터랙션, 테마/i18n, 결제 UI, 알림 UI
- **Backend**: REST API, 인증/인가, Premium 권한, 검색/분석, 결제 처리, 알림/뉴스레터
- **DB**: 사용자, 구독, 결제, 뉴스, 북마크, 알림 등 모든 데이터 저장
- **PayPal**: Orders/Subscriptions API, Webhook, 결제/구독 활성화
- **알림/이메일**: 실시간 Push, 뉴스레터 발송

### 사용 기술 스택
- **Frontend**: HTML5, CSS3, JavaScript(ES6+), SPA 구조
- **Backend**: Node.js, Express.js
- **DB**: MongoDB (NoSQL), Mongoose ORM
- **결제**: PayPal REST API
- **알림/이메일**: Web Push, Nodemailer
- **DevOps**: Docker, Netlify, GitHub Actions
- **기타**: i18n, Toast, CORS, JWT

---

## 3. 프론트엔드 구조 (Frontend Architecture)

### 페이지 구조
- index.html: 메인 뉴스 피드
- app.html: SPA 핵심, 라우팅/동적 UI
- `premium.html`: 프리미엄 기능 안내/결제
- `search.html`: 고급 검색
- `bookmark.html`: 북마크/폴더 관리
- `settings.html`: 테마/i18n/알림 설정

### 라우팅 구조도 (예시)
```
/                → 메인 피드
/search          → 고급 검색
/premium         → 프리미엄 안내/결제
/bookmark        → 북마크 폴더/태그
/settings        → 환경설정(테마, 언어, 알림)
```

### 핵심 UI/UX 요소 설명
- **햄버거 메뉴**: 모바일/데스크탑 모두 대응, 주요 기능 접근
- **검색 페이지**: Boolean/날짜/감정 분석 필터, 실시간 결과
- **프리미엄 페이지**: 결제/구독 안내, PayPal 연동
- **북마크 폴더**: Drag&Drop, 폴더/태그 무제한 생성
- **실시간 알림**: Toast/Push, 뉴스/결제/이벤트 안내

### 테마(라이트/다크) 처리 방식
- CSS 변수 기반 테마 전환
- 사용자 설정(localStorage) 반영
- 시스템 다크모드 자동 감지

### i18n(언어 시스템) 처리 방식
- JSON 기반 다국어 리소스 관리
- 언어 선택 UI, 자동 감지
- 모든 텍스트 동적 변환(예: `i18n.t('news.title')`)

---

## 4. 백엔드 구조 (Backend Architecture)

### API 엔드포인트 전체 목록 + 기능 설명
| Endpoint                | Method | 기능 설명                                 |
|-------------------------|--------|-------------------------------------------|
| `/api/news`             | GET    | 뉴스 목록/검색(필터, 감정 분석)           |
| `/api/news/:id`         | GET    | 뉴스 상세                                 |
| `/api/bookmark`         | GET/POST/DELETE | 북마크/폴더/태그 관리           |
| `/api/premium`          | GET    | 프리미엄 상태 확인                        |
| `/api/paypal/order`     | POST   | PayPal 결제 생성                          |
| `/api/paypal/webhook`   | POST   | PayPal Webhook 이벤트 수신                |
| `/api/notification`     | GET    | 실시간 알림 목록                          |
| `/api/newsletter`       | POST   | 이메일 뉴스레터 발송                      |
| `/api/user`             | GET    | 사용자 정보                               |

### 컨트롤러, 서비스, 미들웨어 구조
- **Controller**: 라우팅/요청 파싱, 서비스 호출
- **Service**: 비즈니스 로직(검색, 결제, 알림, 북마크 등)
- **Middleware**: 인증(JWT), Premium 권한 체크, 에러 핸들링, CORS

### Premium 권한 제어(requirePremium) 로직
```js
function requirePremium(req, res, next) {
  if (!req.user || !req.user.isPremium) {
    return res.status(403).json({ error: 'Premium required' });
  }
  next();
}
```
- 모든 프리미엄 API에 적용, 구독 상태 실시간 검증

### Advanced Search 처리 흐름
- **Boolean 파서**: `"AI AND (OpenAI OR Google)"` → 파싱 후 DB 쿼리
- **감정 분석**: 뉴스 본문/제목 감정 분석 후 필터링
- **날짜 필터**: ISO 날짜 범위, 타임존 처리

---

## 5. 결제 시스템 (PayPal Integration)

### PayPal Orders API 및 Subscriptions API 작동 방식
- **Orders API**: 단건 결제(프리미엄 구매)
- **Subscriptions API**: 월간/연간 구독 관리

### Checkout → Webhook → Subscription 활성화 흐름
1. **Checkout**: 프론트에서 PayPal 결제 UI 호출
2. **Webhook**: 결제 성공/실패 이벤트 수신
3. **Subscription 활성화**: Webhook에서 DB 업데이트, Premium 권한 부여

### Webhook 이벤트 처리 상세 로직
```js
app.post('/api/paypal/webhook', verifySignature, async (req, res) => {
  const event = req.body;
  if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
    await activatePremium(event.resource);
  }
  res.sendStatus(200);
});
```
- **verifySignature**: PayPal 서명 검증
- **activatePremium**: 결제 정보 기반 Premium 활성화

### PaymentLog 저장 구조
- 결제/구독/취소/환불 등 모든 이벤트 기록
- UserID, 결제ID, 상태, 타임스탬프, 원본 JSON 저장

---

## 6. 데이터베이스 모델 (Database Model)

### ERD 수준의 모델 설명
```
[User]---<Subscription>---<PaymentLog>
   |           |
   |           v
   |        [SavedNews]---<BookmarkFolder>
   |           |
   v           v
[Notifications]
```

### 테이블 설명
- **User**: 사용자 정보, Premium 상태, 언어/테마 설정
- **Subscription**: 구독 정보(PayPal ID, 기간, 상태)
- **PaymentLog**: 결제 이벤트 기록
- **SavedNews**: 북마크한 뉴스, 폴더/태그 연결
- **BookmarkFolder**: 폴더/태그, 무제한 생성
- **Notifications**: 실시간 알림, 뉴스/결제/이벤트

---

## 7. 고급 기능 상세 (Advanced Features)

### Advanced Search
- **Boolean 검색**: AND/OR/NOT 파서, 복합 쿼리 지원
- **날짜 필터**: 기간/타임존/상대 날짜(예: “지난주”)
- **감정 분석**: 뉴스 본문/제목 감정 분류(긍정/부정/중립)

### 무제한 북마크 + 폴더/태그
- 폴더/태그 Drag&Drop, 중첩/병합 지원
- 북마크 수 제한 없음(프리미엄)

### 실시간 알림(Push) 시스템
- Web Push API, 브라우저/모바일 대응
- 뉴스/결제/이벤트 실시간 안내

### 이메일 뉴스레터 시스템
- Nodemailer, 예약 발송, 구독자별 맞춤 뉴스

---

## 8. 보안 (SECURITY)

### 인증/인가
- JWT 기반 인증, 토큰 만료/갱신
- Premium 권한 실시간 검증

### API 키/Secret 관리 방식
- .env 환경 변수, GitHub Secrets, 서버 내 암호화

### Webhook 보안 서명 검증
- PayPal 서명 검증 미들웨어 적용
- 이벤트 위변조 방지

### 데이터 보호 전략
- HTTPS, CORS, XSS/CSRF 방어
- 민감 정보 암호화 저장

---

## 9. 에러 처리 (Error Handling)

### 결제 실패 처리
- PayPal 오류/취소/환불 이벤트 실시간 반영
- 사용자에게 Toast/알림 안내

### API 오류 처리 플로우
- 모든 API try/catch, 표준 에러 응답(JSON)
- 에러 로그 DB 저장, 관리자 알림

### 네트워크 예외 처리
- 프론트: fetch 에러 Toast 안내
- 백엔드: 재시도/백오프, 장애 감지

---

## 10. 성능/최적화 (Performance & Scaling)

### 캐싱 전략
- 뉴스/검색 결과 Redis 캐싱
- 감정 분석 결과 DB 캐싱

### API 부하 분산 구조
- Nginx 리버스 프록시, Node.js 클러스터링
- DB 인덱스/샤딩, 비동기 처리

---

## 11. 테스트 전략 (Testing Strategy)

### 단위 테스트
- Controller/Service/Model별 Jest 테스트

### 통합 테스트
- API 엔드포인트, 결제/알림/북마크 시나리오

### 결제 시스템 시뮬레이션 테스트
- PayPal Sandbox, Webhook 이벤트 모킹

---

## 12. 운영/배포 (Deployment/DevOps)

### 배포 파이프라인
- GitHub Actions: 빌드/테스트/배포 자동화
- Netlify: 프론트엔드 배포
- Docker: 백엔드/DB 컨테이너화

### 환경 변수 구조
- .env 파일, 비밀키/DB/PayPal 설정 분리

### 모니터링 방법
- 로그/에러 DB 저장, 관리자 알림
- Uptime Robot, Sentry, Netlify Analytics

---

## 13. 향후 개선점 (Future Improvements)

- 뉴스 추천 AI 고도화(개인화/클러스터링)
- 결제 시스템 Stripe 등 추가 지원
- 알림/뉴스레터 고도화(스케줄링, 통계)
- 백엔드/DB 수평 확장, 글로벌 CDN 적용
- 오픈 API/플러그인 생태계 확장

---

## 14. 부록 (Appendix)

### 샘플 API 요청/응답(JSON)
```json
// 뉴스 검색 요청
GET /api/news?query=AI&date=2025-12-01
// 응답
{
  "results": [
    { "id": "123", "title": "AI 혁신", "sentiment": "positive", ... }
  ],
  "total": 1
}
```

### 주요 코드 스니펫(핵심 알고리즘 일부)
```js
// Boolean 검색 파서 예시
function parseBooleanQuery(query) {
  // "AI AND (OpenAI OR Google)" → [{AND: ["AI", {OR: ["OpenAI", "Google"]}]}]
  // ...existing code...
}

// Premium 권한 미들웨어
function requirePremium(req, res, next) {
  if (!req.user || !req.user.isPremium) {
    return res.status(403).json({ error: 'Premium required' });
  }
  next();
}
```

### 화면 구조 표
| 페이지         | 주요 기능                | 접근 경로      |
|----------------|-------------------------|---------------|
| 메인 피드      | 뉴스 목록/검색          | `/`           |
| 프리미엄 안내  | 결제/구독               | `/premium`    |
| 북마크 관리    | 폴더/태그/Drag&Drop     | bookmark   |
| 고급 검색      | Boolean/감정/날짜 필터  | `/search`     |
| 환경설정       | 테마/i18n/알림          | `/settings`   |

---

## 결론 및 설계 의도

본 플랫폼은 “신뢰성, 확장성, 사용자 경험”을 최우선으로 설계되었습니다.  
SPA 구조와 API 중심 백엔드, 결제/알림/북마크 등 고급 기능을 통합하여  
실제 서비스 환경에서 요구되는 모든 요소(보안, 성능, 운영, 테스트)를  
전문적으로 구현하였습니다.

- **구조 선택 이유**: SPA+API 구조는 확장성·유지보수·성능에 최적화됨.
- **성능상 장점**: 캐싱·비동기·분산 구조로 대규모 트래픽 대응.
- **문제 해결 전략**: 모든 주요 기능에 대해 에러 처리·보안·테스트를 체계적으로 적용.

본 보고서는 개발자, 교수, 투자자, 팀원 모두가  
플랫폼의 구조와 실제 구현을 명확히 이해할 수 있도록 작성되었습니다.

---

**문의 및 추가 요청 시, 각 섹션별 상세 코드/구조/테스트 결과를 추가 제공 가능합니다.**

# AI·IT News Curation Platform  
**Technical Report (Final Version)**

Developer & Report Author: **25615008 Kim Seongmin**  
---

## 1. Overview

### Project Purpose
Build an integrated platform that rapidly and accurately curates the latest AI and IT news while offering personalized features and premium subscription-based capabilities such as advanced search, unlimited bookmarks, notifications, and newsletters.

### User Value
- **Information Reliability:** Only validated news sources are presented; link integrity is automatically checked.
- **Personalization:** Bookmark folders, tags, push alerts, translation, summarization, and other tailored features.
- **Premium Experience:** Subscription-based advanced features such as unlimited bookmarks, advanced search, and exclusive newsletters.

### Key Features
- AI-powered news recommendation and search (sentiment analysis, Boolean queries, date filters)
- Bookmark management with folders and tags
- Real-time push notifications and email newsletters
- PayPal-based payment and subscription system
- Multi-language support (i18n), light/dark themes

---

## 2. System Architecture

### Full Architecture (ASCII Diagram)
```
+-------------------+      +-------------------+      +-------------------+
|   Frontend (SPA)  |<---->|   Backend (API)   |<---->|   Database (DB)   |
+-------------------+      +-------------------+      +-------------------+
        |                        |                          |
        v                        v                          v
+-------------------+      +-------------------+      +-------------------+
|  PayPal Checkout  |<---->| Webhook Listener  |<---->| PaymentLog Table  |
+-------------------+      +-------------------+      +-------------------+
        |                        |                          |
        v                        v                          v
+-------------------+      +-------------------+      +-------------------+
| Push/Email System |<---->| Notification API  |<---->| Notifications DB  |
+-------------------+      +-------------------+      +-------------------+
```
markdown
코드 복사

### System Flow Summary
- **Frontend:** SPA UI rendering, theme/i18n management, payment UI, notification interface  
- **Backend:** REST API, authentication/authorization, premium control, search/analysis, payment handling  
- **Database:** Stores all user, subscription, payment, news, bookmark, and notification data  
- **PayPal:** Orders/Subscriptions API integration + webhook lifecycle events  
- **Notifications/Email:** Real-time push alerts and newsletters  

### Technology Stack
- **Frontend:** HTML5, CSS3, JavaScript (ES6+), SPA  
- **Backend:** Node.js, Express.js  
- **Database:** MongoDB, Mongoose ORM  
- **Payments:** PayPal REST API  
- **Notifications:** Web Push API, Nodemailer  
- **DevOps:** Docker, Netlify, GitHub Actions  
- **Others:** i18n, Toast UI, CORS, JWT  

---

## 3. Frontend Architecture

### Page Structure
- `index.html`: Main news feed  
- `app.html`: Core SPA logic and routing  
- `premium.html`: Premium subscription flow  
- `search.html`: Advanced search  
- `bookmark.html`: Bookmark folders/tags  
- `settings.html`: Theme/language/notification settings  

### Routing
/ → Main Feed
/search → Advanced Search
/premium → Premium Info & Payment
/bookmark → Bookmark Manager
/settings → User Settings

markdown
코드 복사

### Core UI/UX Components
- **Hamburger Menu:** Global mobile/desktop navigation  
- **Advanced Search:** Boolean, sentiment, and date filters  
- **Premium Page:** Subscription options + PayPal payment  
- **Bookmark Folders:** Drag & Drop, unlimited folders/tags  
- **Notifications:** Toast UI + Web Push  

### Theme (Light/Dark)
- CSS variables  
- User preference stored locally  
- Auto-detect system dark mode  

### i18n
- JSON-based language resources  
- Language switcher + auto-detection  
- Dynamic text rendering via `i18n.t()`  

---

## 4. Backend Architecture

### API Endpoints
| Endpoint                | Method | Description                                  |
|-------------------------|--------|----------------------------------------------|
| `/api/news`             | GET    | News list/search                             |
| `/api/news/:id`         | GET    | News detail                                  |
| `/api/bookmark`         | GET/POST/DELETE | Bookmark/folder/tag management  |
| `/api/premium`          | GET    | Check premium status                         |
| `/api/paypal/order`     | POST   | Create PayPal order                          |
| `/api/paypal/webhook`   | POST   | Handle PayPal webhook events                 |
| `/api/notification`     | GET    | Fetch notifications                          |
| `/api/newsletter`       | POST   | Send newsletters                             |
| `/api/user`             | GET    | Fetch user profile                           |

### Architecture Layers
- **Controllers:** Request handling and validation  
- **Services:** Business logic (payment, search, notifications)  
- **Middleware:** JWT authentication, premium guard, error handling  

### Premium Guard
```js
function requirePremium(req, res, next) {
  if (!req.user || !req.user.isPremium) {
    return res.status(403).json({ error: 'Premium required' });
  }
  next();
}
```
Advanced Search Flow
Boolean query parsing

Sentiment classification

Date/period filtering

5. PayPal Payment Integration
Orders & Subscriptions API
Orders API: One-time payments

Subscriptions API: Recurring monthly/annual plans

Checkout → Webhook → Activation
User initiates PayPal checkout

PayPal sends webhook event

Backend activates subscription and updates user status

Webhook Example
js
코드 복사
app.post('/api/paypal/webhook', verifySignature, async (req, res) => {
  const event = req.body;
  if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
    await activatePremium(event.resource);
  }
  res.sendStatus(200);
});
PaymentLog Model
Includes PayPal IDs, payload, timestamps, status

6. Database Model
ERD
php-template
코드 복사
[User]---<Subscription>---<PaymentLog>
   |           |
   |           v
   |        [SavedNews]---<BookmarkFolder>
   |           |
   v           v
[Notifications]
Table Descriptions
User: Profile, language/theme settings, premium state

Subscription: PayPal subscription lifecycle

PaymentLog: Full history of payment events

SavedNews: Bookmarked items

BookmarkFolder: Unlimited folders/tags

Notifications: Push/email record storage

7. Advanced Features
Advanced Search
Boolean query engine

Sentiment filtering

Date-range filtering

Unlimited Bookmarks (Folders/Tags)
Drag & Drop

Unlimited folders/tags for premium users

Real-Time Push Notifications
Web Push API

Alerts for news, updates, payments

Email Newsletter
Nodemailer

Personalized content and scheduling

8. Security
Auth & Access Control
JWT-based authentication

Premium verification middleware

API Key Management
.env and GitHub Secrets

Webhook Security
PayPal signature verification

Data Protection
HTTPS, CORS, XSS/CSRF protection

Encrypted sensitive data

9. Error Handling
Payment Errors
Cancellation/refund detection via webhook

Real-time push/email notification

API Errors
Unified JSON error responses

Error logs stored for admin review

Network Errors
Frontend: Toast alerts

Backend: Retry/backoff algorithm

10. Performance & Scaling
Caching
Redis caching for heavy searches

Database caching for sentiment results

Load Distribution
Nginx reverse proxy

Node.js clustering

DB indexing and sharding

11. Testing Strategy
Unit Testing
Jest testing for controllers, services, models

Integration Testing
API-level tests: payment, search, notifications

Payment Testing
PayPal Sandbox

Mock webhook simulations

12. Deployment / DevOps
CI/CD Pipeline
GitHub Actions automation

Frontend on Netlify

Backend in Docker containers

Environment Variables
.env separation for secrets (PayPal, DB, JWT)

Monitoring
Sentry

Uptime Robot

Netlify Analytics

13. Future Improvements
More advanced AI-driven recommendation system

Additional payment gateways (Stripe, Toss Payments)

Enhanced scheduling/statistics for newsletters

Horizontal backend scaling + global CDN

Open API/plugin ecosystem expansion

14. Appendix
Sample API
json
코드 복사
GET /api/news?query=AI&date=2025-12-01
{
  "results": [
    { "id": "123", "title": "AI Innovation", "sentiment": "positive" }
  ],
  "total": 1
}
Key Code Snippets
js
코드 복사
function parseBooleanQuery(query) {
  // Boolean query parsing logic
}

function requirePremium(req, res, next) {
  if (!req.user || !req.user.isPremium) {
    return res.status(403).json({ error: 'Premium required' });
  }
  next();
}
Page Structure Table
Page	Description	Path
Main Feed	News listing/search	/
Premium Page	Subscription & payment	/premium
Bookmark Manager	Folder/Tag/Drag & Drop	/bookmark
Advanced Search	Boolean/Sentiment/Date filters	/search
Settings	Theme/i18n/Notifications	/settings

Conclusion
This platform emphasizes reliability, scalability, and user experience, integrating a SPA frontend with an API-driven backend, PayPal payments, advanced search, real-time notifications, and bookmark management.

Architectural Rationale: SPA + API offers extensibility, maintainability, and performance.

Performance Advantages: Caching, asynchronous pipelines, and distributed architecture handle high traffic efficiently.

Stability: Robust error handling, layered security, and comprehensive testing ensure system reliability.

This report enables developers, professors, investors, and collaborators to fully understand the platform’s structure and design decisions.
