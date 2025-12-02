# Translation & Summarization System - Usage Guide

## Overview

자동 번역 및 요약 기능이 추가된 AI/IT 뉴스 큐레이션 플랫폼 백엔드입니다.

## 주요 기능

### 1. 자동 언어 감지
- 수집된 뉴스의 언어를 자동으로 감지합니다
- 한국어, 영어, 일본어, 중국어 등 주요 언어 지원

### 2. 자동 번역
- 비한국어 기사를 자동으로 한국어로 번역
- OpenAI GPT-4 사용으로 자연스러운 번역 품질
- 기술 용어 및 고유명사 보존

### 3. 한국어 요약
- 모든 기사에 대해 한국어 요약 생성
- 3~5문장으로 핵심 내용 전달

## 설치 및 설정

### 1. Environment 설정

`.env` 파일에 다음을 추가:

```bash
# OpenAI API Key (필수)
OPENAI_API_KEY=sk-your-api-key-here

# Translation Settings (선택)
OPENAI_MODEL=gpt-4
TRANSLATION_BATCH_SIZE=5
TRANSLATION_RETRY_ATTEMPTS=3
```

### 2. 데이터베이스 마이그레이션

```bash
cd backend
node db/migrations/001_add_translation_fields.js
```

## 사용법

### 1. 서버 실행

```bash
npm run dev
```

### 2. 뉴스 수집 (자동 번역 포함)

```bash
npm run collect
```

새로 수집되는 뉴스는 자동으로:
- 언어 감지
- 필요시 한국어로 번역
- 한국어 요약 생성
- 태그 추출

### 3. 기존 데이터 번역 (Backfill)

```bash
# 최대 50개 처리
npm run translate

# 특정 개수 처리
node workers/translationWorker.js 100
```

### 4. API 사용

#### 뉴스 상세 조회

```bash
GET /api/news/:id
```

**응답 예시:**
```json
{
  "id": "123",
  "title": "OpenAI, 새로운 GPT 모델 공개",
  "source_name": "The Verge",
  "author_name": "John Doe",
  "original_language": "en",
  "published_at": "2025-11-27T12:34:56Z",
  "url": "https://original-link",
  "is_translated": true,
  "meta": {
    "source_name": "The Verge",
    "author_name": "John Doe",
    "published_at": "2025-11-27T12:34:56Z"
  },
  "content": {
    "original": "OpenAI has announced...",
    "translated_ko": "OpenAI가 발표했습니다..."
  },
  "summary": {
    "ko": "이 기사는 OpenAI가 새로운 GPT 모델을 공개했으며..."
  },
  "tags": ["AI", "OpenAI", "GPT"],
  "stats": {
    "views": 150,
    "clicks": 45
  }
}
```

## 아키텍처

### 데이터 플로우

```
뉴스 수집
  ↓
언어 감지
  ↓
번역 필요? → Yes → 번역 (GPT-4)
         ↓   No
         ↓
한국어 요약 생성
  ↓
태그 추출
  ↓
데이터베이스 저장
```

### 주요 컴포넌트

1. **languageDetector.js**: Unicode 기반 언어 감지
2. **translator.js**: OpenAI 기반 번역 서비스
3. **summarizer.js**: 한국어 요약 생성
4. **newsCollector.js**: 수집 파이프라인 (번역 통합)
5. **translationWorker.js**: 백그라운드 번역 작업

## 성능 최적화

### 캐싱
- 번역된 내용은 DB에 저장되어 재사용
- API 응답 캐싱으로 빠른 조회

### On-Demand Translation
- 번역이 누락된 경우 요청 시점에 즉시 처리
- 백그라운드에서 DB 업데이트

### Batch Processing
- 대량 번역 시 배치 처리
- Rate limiting 방지를 위한 지연 처리

## 트러블슈팅

### 번역이 안 되는 경우

1. OpenAI API 키 확인
2. 네트워크 연결 확인
3. 로그에서 에러 메시지 확인

### 기존 데이터 번역

```bash
# 통계 확인
node workers/translationWorker.js 0

# 처리
npm run translate
```

## 모니터링

### 번역 통계 조회

```javascript
const TranslationWorker = require('./workers/translationWorker');
const worker = new TranslationWorker();
const stats = await worker.getStats();
console.log(stats);
```

## 참고사항

- 번역 비용: OpenAI API 사용량에 따라 과금
- 권장: gpt-4-turbo 또는 gpt-4o 모델 사용
- 대량 처리 시 API rate limit 주의
