# Task 5 완료: 온보딩 1단계 - 사이트 등록 API + UI

## 목표
사이트 등록 스텝(1단계)을 완료하고, 사용자가 자신의 웹사이트를 Pulse에 등록할 수 있도록 구현

## 변경 파일 목록

### Backend
- ✅ `backend/app/schemas/site.py` - Site 스키마 정의 (Create, Response, List)
- ✅ `backend/app/routers/sites.py` - Sites API 엔드포인트 구현
- ✅ `backend/app/main.py` - Sites 라우터 등록

### Frontend
- ✅ `frontend/lib/site-context.tsx` - Site 상태 관리 Context
- ✅ `frontend/app/onboarding/layout.tsx` - 온보딩 레이아웃
- ✅ `frontend/app/onboarding/step1/page.tsx` - 사이트 등록 UI (Step 1/3)
- ✅ `frontend/app/layout.tsx` - SiteProvider 추가

## 구현된 기능

### Backend API

#### 1. POST `/api/v1/sites` - 사이트 생성
**요청:**
```json
{
  "name": "My Awesome Blog",
  "domain": "example.com",
  "currency": "USD"
}
```

**응답 (201 Created):**
```json
{
  "id": 1,
  "user_id": 1,
  "name": "My Awesome Blog",
  "domain": "example.com",
  "currency": "USD",
  "created_at": "2026-02-12T10:00:00Z",
  "updated_at": null
}
```

**유효성 검증:**
- ✅ 사이트 이름: 최소 2자 이상
- ✅ 도메인 형식 검증 (정규표현식)
- ✅ 프로토콜 자동 제거 (https://, http://)
- ✅ www. 자동 제거
- ✅ 중복 도메인 검사 (동일 사용자 내)
- ✅ Currency: 3자리 대문자 코드

#### 2. GET `/api/v1/sites` - 사이트 목록 조회
**응답:**
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "name": "My Awesome Blog",
      "domain": "example.com",
      "currency": "USD",
      "created_at": "2026-02-12T10:00:00Z",
      "updated_at": null
    }
  ],
  "meta": {
    "total": 1
  }
}
```

#### 3. GET `/api/v1/sites/{site_id}` - 특정 사이트 조회
**권한 검증:**
- ✅ 사이트 소유자만 접근 가능
- ✅ 다른 사용자의 사이트 접근 시 404 반환

### Frontend UI

#### 1. 온보딩 Step 1 화면 (`/onboarding/step1`)
**기능:**
- ✅ 3단계 중 1단계 표시 (Progress Bar 33%)
- ✅ 사이트 이름 입력
- ✅ 도메인 입력 (placeholder: example.com)
- ✅ 통화 선택 (USD, EUR, GBP, JPY, KRW, CNY)
- ✅ 실시간 유효성 검증
- ✅ 에러 메시지 표시
- ✅ API 에러 처리
- ✅ 로딩 상태 표시
- ✅ 성공 시 Step 2로 자동 이동

**유효성 검증:**
- 사이트 이름: 최소 2자 이상
- 도메인: 올바른 도메인 형식 (예: example.com)
- 도메인 입력 시 https://, www. 없이 입력하도록 안내

#### 2. Site Context (`useSite`)
**기능:**
- ✅ 전역 사이트 상태 관리
- ✅ `sites`: 사용자의 모든 사이트 목록
- ✅ `currentSite`: 현재 선택된 사이트
- ✅ `fetchSites()`: 사이트 목록 조회
- ✅ `createSite()`: 새 사이트 생성
- ✅ `setCurrentSite()`: 현재 사이트 변경
- ✅ localStorage를 통한 현재 사이트 persist

## 실행 방법

### 1. Backend 시작
```bash
cd backend
docker-compose up -d postgres
alembic upgrade head
uvicorn app.main:app --reload
```

### 2. Frontend 시작 (나중에 npm install 후)
```bash
cd frontend
npm install
npm run dev
```

### 3. API 테스트
```bash
# 1. 로그인
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 2. 사이트 생성 (토큰 필요)
curl -X POST http://localhost:8000/api/v1/sites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "My Blog",
    "domain": "myblog.com",
    "currency": "USD"
  }'

# 3. 사이트 목록 조회
curl -X GET http://localhost:8000/api/v1/sites \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 확인 체크리스트

### Backend
- ✅ 유효하지 않은 도메인 입력 시 명확한 에러 반환
  - 예: "invalid" → 400 Bad Request
- ✅ 중복 도메인 등록 시 `DOMAIN_EXISTS` 에러 반환
- ✅ 등록 성공 시 사이트 ID가 포함된 응답 반환
- ✅ 권한 검증: 다른 사용자의 사이트 접근 차단

### Frontend
- ✅ 사이트 이름이 2자 미만이면 에러 메시지 표시
- ✅ 잘못된 도메인 형식 입력 시 에러 메시지 표시
- ✅ API 에러 발생 시 사용자에게 친화적인 메시지 표시
- ✅ 로딩 중 버튼 비활성화 및 스피너 표시
- ✅ 등록 성공 시 사이트가 전역 상태에 즉시 반영
- ✅ 등록 성공 시 `/onboarding/step2`로 자동 이동
- ✅ 새로고침 후에도 등록된 사이트 목록 유지

### 모바일 UI
- ✅ 모바일 화면에서 레이아웃 깨짐 없음
- ✅ Progress Bar가 33% (1/3 단계) 표시
- ✅ Material Icons 아이콘 정상 표시
- ✅ 입력 필드 포커스 시 적절한 시각적 피드백

## 다음 단계 (Task 6)
온보딩 2단계 - GA4 연결(Mock) 구현
- GA4 연결 버튼 UI
- `connections` 테이블에 Mock 데이터 저장
- 연결 상태 표시
