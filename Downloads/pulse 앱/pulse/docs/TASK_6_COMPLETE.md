# Task 6 완료: 온보딩 2단계 - GA4 연결(Mock)

## 목표
GA4 연결 Mock 플로우를 구현하여 사용자가 Google Analytics 4 property를 연결할 수 있도록 함

## 변경 파일 목록

### Backend
- ✅ `backend/app/schemas/connection.py` - Connection 스키마 정의
- ✅ `backend/app/routers/connections.py` - Connections API 엔드포인트 구현
- ✅ `backend/app/main.py` - Connections 라우터 등록

### Frontend
- ✅ `frontend/lib/api.ts` - API client에 get/post/put/delete 메서드 추가
- ✅ `frontend/app/onboarding/step2/page.tsx` - GA4 연결 UI (Step 2/3)

## 구현된 기능

### Backend API

#### 1. GET `/api/v1/connections/ga4/properties` - GA4 속성 목록 (Mock)
**응답:**
```json
[
  {
    "property_id": "properties/123456789",
    "property_name": "GA4-123456789",
    "display_name": "My Blog (GA4)"
  },
  {
    "property_id": "properties/987654321",
    "property_name": "GA4-987654321",
    "display_name": "Tech Site (GA4)"
  },
  {
    "property_id": "properties/456789123",
    "property_name": "GA4-456789123",
    "display_name": "News Portal (GA4)"
  }
]
```

**Note:** MVP에서는 Mock 데이터를 반환. Production에서는 Google Analytics Data API를 호출하여 실제 GA4 속성 목록 조회

#### 2. POST `/api/v1/connections` - 연결 생성 (Upsert)
**요청:**
```json
{
  "site_id": 1,
  "provider": "ga4",
  "property_id": "properties/123456789",
  "property_name": "GA4-123456789"
}
```

**응답 (201 Created):**
```json
{
  "id": 1,
  "site_id": 1,
  "provider": "ga4",
  "property_id": "properties/123456789",
  "property_name": "GA4-123456789",
  "connected_at": "2026-02-12T10:00:00Z",
  "last_synced_at": null
}
```

**동작:**
- ✅ 사이트 소유권 검증 (다른 사용자 사이트 접근 차단)
- ✅ 기존 연결이 있으면 업데이트 (Upsert)
- ✅ Mock 토큰 저장 (`access_token`, `refresh_token`)
- ✅ Production에서는 OAuth 플로우 및 암호화된 토큰 저장 필요

#### 3. GET `/api/v1/connections?site_id={site_id}` - 사이트 연결 목록
**응답:**
```json
{
  "data": [
    {
      "id": 1,
      "site_id": 1,
      "provider": "ga4",
      "property_id": "properties/123456789",
      "property_name": "GA4-123456789",
      "connected_at": "2026-02-12T10:00:00Z",
      "last_synced_at": null
    }
  ],
  "meta": {
    "site_id": 1,
    "total": 1
  }
}
```

**권한 검증:**
- ✅ 사이트 소유자만 접근 가능
- ✅ 다른 사용자의 사이트 연결 조회 시 403 반환

#### 4. DELETE `/api/v1/connections/{connection_id}` - 연결 삭제
**응답:** 204 No Content

**권한 검증:**
- ✅ 사이트 소유자만 삭제 가능

### Frontend UI

#### 1. 온보딩 Step 2 화면 (`/onboarding/step2`)
**기능:**
- ✅ 3단계 중 2단계 표시 (Progress Bar 66%)
- ✅ GA4 아이콘 및 설명
- ✅ GA4 property 목록 자동 로드
- ✅ Property 선택 UI (라디오 버튼 스타일)
- ✅ "Connect GA4" 버튼
- ✅ 연결 성공 메시지 표시
- ✅ 연결 완료 후 Step 3로 자동 이동
- ✅ "Skip for now" 옵션 제공

**상태 관리:**
- ✅ 기존 연결 확인 (이미 연결된 경우 표시)
- ✅ 로딩 상태 (속성 로드 중, 연결 중)
- ✅ 에러 처리 (API 실패 시 사용자 친화적 메시지)

**UX 플로우:**
1. 페이지 로드 시 GA4 속성 목록 자동 조회
2. 기존 연결 확인 (있으면 선택된 상태로 표시)
3. 사용자가 속성 선택
4. "Connect GA4" 버튼 클릭
5. 연결 성공 메시지 표시
6. 0.5초 후 Step 3으로 이동

### API Client 개선

#### `frontend/lib/api.ts`
**추가된 메서드:**
- ✅ `get<T>(endpoint: string)` - GET 요청
- ✅ `post<T>(endpoint: string, data?: any)` - POST 요청
- ✅ `put<T>(endpoint: string, data?: any)` - PUT 요청
- ✅ `delete<T>(endpoint: string)` - DELETE 요청

**기능:**
- ✅ 자동 인증 헤더 추가 (localStorage에서 토큰 읽기)
- ✅ 통합된 에러 처리
- ✅ TypeScript 제네릭 지원
- ✅ Content-Type 자동 설정

## 실행 방법

### 1. Backend 테스트
```bash
# GA4 속성 목록 조회
curl -X GET http://localhost:8000/api/v1/connections/ga4/properties \
  -H "Authorization: Bearer YOUR_TOKEN"

# GA4 연결 생성
curl -X POST http://localhost:8000/api/v1/connections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "site_id": 1,
    "provider": "ga4",
    "property_id": "properties/123456789",
    "property_name": "GA4-123456789"
  }'

# 사이트 연결 목록 조회
curl -X GET "http://localhost:8000/api/v1/connections?site_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Frontend 플로우
1. Step 1에서 사이트 등록
2. 자동으로 Step 2로 이동
3. GA4 속성 목록이 자동으로 로드됨
4. 속성 선택 후 "Connect GA4" 클릭
5. 연결 성공 후 Step 3으로 이동

## 확인 체크리스트

### Backend
- ✅ GA4 속성 목록 API 호출 시 Mock 데이터 3개 반환
- ✅ 잘못된 site_id로 연결 시도 시 404 에러 반환
- ✅ 다른 사용자의 사이트에 연결 시도 시 403 에러 반환
- ✅ 동일 사이트에 GA4 중복 연결 시 기존 연결 업데이트 (Upsert)
- ✅ 연결 생성 시 `connections` 테이블에 레코드 저장 확인

### Frontend
- ✅ Step 2 페이지 로드 시 GA4 속성 목록 자동 조회
- ✅ 속성 선택 시 시각적 피드백 (파란색 테두리 + 체크 아이콘)
- ✅ 연결 버튼 클릭 시 로딩 상태 표시
- ✅ 연결 성공 시 녹색 성공 메시지 표시
- ✅ 연결 성공 후 "Continue" 버튼으로 변경
- ✅ Step 3으로 이동 정상 동작
- ✅ "Skip for now" 클릭 시 Step 3으로 이동
- ✅ 새로고침 후에도 연결 상태 유지 (기존 연결 표시)

### 모바일 UI
- ✅ Progress Bar가 66% (2/3 단계) 표시
- ✅ GA4 아이콘 및 설명 표시
- ✅ 속성 선택 카드 터치 영역 충분
- ✅ 로딩/에러/성공 상태 명확히 구분

### 데이터 무결성
- ✅ provider 필드에 'ga4' 저장
- ✅ property_id와 property_name 정확히 저장
- ✅ connected_at 타임스탬프 자동 기록
- ✅ 사이트 삭제 시 연결도 함께 삭제 (Cascade)

## Production 준비 사항

**MVP → Production 전환 시 필요한 작업:**
1. ✅ Google OAuth 2.0 플로우 구현
2. ✅ Google Analytics Data API 연동
3. ✅ 토큰 암호화 저장 (현재는 Mock 토큰)
4. ✅ 토큰 갱신 로직 (refresh_token 사용)
5. ✅ 실제 property 목록 조회

## 다음 단계 (Task 7)
온보딩 3단계 - AdSense 연결(Mock) 구현
- AdSense 계정 선택 UI
- `connections` 테이블에 `provider='adsense'` 레코드 생성
- 연결 완료 후 앱 메인 화면으로 이동
