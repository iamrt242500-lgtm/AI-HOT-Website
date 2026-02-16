# Task 7 완료: 온보딩 3단계 - AdSense 연결(Mock)

## 목표
AdSense 연결 Mock 플로우를 구현하여 온보딩 프로세스를 완료하고 사용자를 메인 앱으로 안내

## 변경 파일 목록

### Frontend
- ✅ `frontend/app/onboarding/step3/page.tsx` - AdSense 연결 UI (Step 3/3)

### Backend
- ✅ Task 6에서 이미 구현됨:
  - `GET /api/v1/connections/adsense/accounts` - Mock AdSense 계정 목록
  - `POST /api/v1/connections` - provider='adsense' 지원

## 구현된 기능

### Frontend UI

#### 1. 온보딩 Step 3 화면 (`/onboarding/step3`)
**기능:**
- ✅ 3단계 중 3단계 표시 (Progress Bar 100%)
- ✅ AdSense 아이콘 (녹색 테마) 및 설명
- ✅ AdSense 계정 목록 자동 로드
- ✅ 계정 선택 UI (라디오 버튼 스타일, 녹색 테마)
- ✅ "Connect AdSense" 버튼 (녹색)
- ✅ 연결 성공 메시지 표시
- ✅ 연결 완료 후 Home 화면으로 자동 이동 (1초 딜레이)
- ✅ "Skip for now" 옵션 제공
- ✅ 온보딩 완료 안내 메시지

**상태 관리:**
- ✅ 기존 연결 확인 (이미 연결된 경우 표시)
- ✅ 로딩 상태 (계정 로드 중, 연결 중)
- ✅ 에러 처리 (API 실패 시 사용자 친화적 메시지)

**UX 플로우:**
1. 페이지 로드 시 AdSense 계정 목록 자동 조회
2. 기존 연결 확인 (있으면 선택된 상태로 표시)
3. 사용자가 계정 선택
4. "Connect AdSense" 버튼 클릭
5. 연결 성공 메시지 + "Redirecting to home..." 표시
6. 1초 후 `/home`으로 이동

**디자인 차별화:**
- ✅ AdSense는 녹색 테마 (GA4는 파란색)
- ✅ 수익 관련 아이콘 (`monetization_on`)
- ✅ 완료 단계임을 강조하는 정보 카드

### Backend API (Task 6에서 구현됨)

#### 1. GET `/api/v1/connections/adsense/accounts` - AdSense 계정 목록 (Mock)
**응답:**
```json
[
  {
    "account_id": "pub-1234567890123456",
    "account_name": "AdSense-Primary",
    "display_name": "Primary AdSense Account"
  },
  {
    "account_id": "pub-6543210987654321",
    "account_name": "AdSense-Secondary",
    "display_name": "Secondary AdSense Account"
  }
]
```

#### 2. POST `/api/v1/connections` - AdSense 연결 생성
**요청:**
```json
{
  "site_id": 1,
  "provider": "adsense",
  "property_id": "pub-1234567890123456",
  "property_name": "AdSense-Primary"
}
```

**동작:**
- ✅ provider 필드에 'adsense' 저장
- ✅ 기존 AdSense 연결이 있으면 업데이트 (Upsert)
- ✅ GA4와 AdSense를 provider로 구분하여 별도 저장

## 온보딩 플로우 전체 요약

### Step 1: 사이트 등록 (`/onboarding/step1`)
- 사이트 이름, 도메인, 통화 입력
- → Step 2로 이동

### Step 2: GA4 연결 (`/onboarding/step2`)
- GA4 property 선택 및 연결
- → Step 3으로 이동

### Step 3: AdSense 연결 (`/onboarding/step3`)
- AdSense 계정 선택 및 연결
- → Home 화면으로 이동 (온보딩 완료)

## 실행 방법

### Frontend 플로우 테스트
1. 로그인 후 Step 1 완료
2. Step 2에서 GA4 연결
3. Step 3로 자동 이동
4. AdSense 계정 선택
5. "Connect AdSense" 클릭
6. 1초 후 Home 화면으로 자동 이동

### API 테스트
```bash
# AdSense 계정 목록 조회
curl -X GET http://localhost:8000/api/v1/connections/adsense/accounts \
  -H "Authorization: Bearer YOUR_TOKEN"

# AdSense 연결 생성
curl -X POST http://localhost:8000/api/v1/connections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "site_id": 1,
    "provider": "adsense",
    "property_id": "pub-1234567890123456",
    "property_name": "AdSense-Primary"
  }'

# 사이트의 모든 연결 확인 (GA4 + AdSense)
curl -X GET "http://localhost:8000/api/v1/connections?site_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 확인 체크리스트

### Backend
- ✅ AdSense 계정 목록 API 호출 시 Mock 데이터 2개 반환
- ✅ GA4/AdSense provider 구분 저장 확인
- ✅ 중복 연결 시 Upsert 동작 (기존 연결 업데이트)
- ✅ 동일 사이트에 GA4와 AdSense 모두 연결 가능
- ✅ connections 테이블에 provider 필드로 구분 저장

### Frontend
- ✅ Step 3 페이지 로드 시 AdSense 계정 목록 자동 조회
- ✅ Progress Bar 100% (3/3 단계) 표시
- ✅ 녹색 테마로 AdSense 구분 (GA4는 파란색)
- ✅ 계정 선택 시 시각적 피드백 (녹색 테두리 + 체크 아이콘)
- ✅ 연결 버튼 클릭 시 로딩 상태 표시
- ✅ 연결 성공 시 녹색 성공 메시지 + "Redirecting to home..." 표시
- ✅ 1초 후 `/home`으로 자동 이동
- ✅ "Skip for now" 클릭 시 즉시 Home으로 이동
- ✅ 온보딩 완료 안내 정보 카드 표시

### 데이터 무결성
- ✅ provider='adsense' 정확히 저장
- ✅ property_id에 AdSense account ID 저장
- ✅ 동일 사이트에 GA4와 AdSense 별도 레코드로 저장
- ✅ 새로고침 후에도 연결 상태 유지

### 온보딩 완료 플로우
- ✅ Step 1 → Step 2 → Step 3 → Home 순차 진행
- ✅ 각 단계에서 Skip 가능
- ✅ 뒤로가기 시 이전 단계로 복귀 가능
- ✅ 온보딩 완료 후 Home 화면 접근 가능

## 중복 연결 처리 규칙

**Upsert 정책 (Task 6에서 구현):**
1. 동일 `site_id` + 동일 `provider` 조합이 있으면:
   - 기존 레코드 업데이트 (property_id, property_name)
2. 없으면:
   - 새 레코드 생성

**예시:**
- Site 1에 GA4 연결 → `connections` 레코드 1개 (provider='ga4')
- Site 1에 AdSense 연결 → `connections` 레코드 2개 (ga4 + adsense)
- Site 1에 GA4 재연결 → 기존 GA4 레코드 업데이트 (총 2개 유지)

## Production 준비 사항

**MVP → Production 전환 시 필요한 작업:**
1. ✅ Google AdSense Management API 연동
2. ✅ OAuth 2.0 플로우 구현
3. ✅ 토큰 암호화 저장
4. ✅ 실제 AdSense 계정 목록 조회
5. ✅ AdSense Reporting API 연동 준비

## 다음 단계 (Task 8)
더미 데이터 동기화 Job + 데이터 생성
- 사이트별 최근 30일 `page_daily_metrics` 생성
- 사이트별 최근 30일 `revenue_daily_metrics` 생성
- 페이지 URL 20~50개 랜덤 생성
- revenue와 pageviews 사이 약한 상관관계 부여
- `/api/v1/dev/sync-dummy` endpoint 또는 CLI 스크립트
- `sync_jobs` 로그 기록
