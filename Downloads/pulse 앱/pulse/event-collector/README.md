# Pulse Event Collector + Analytics Toolkit

퍼스트파티 이벤트 수집, 동의 기반 거버넌스, EQS, 퍼널/코호트/경로 + 수익 결합 분석을 제공하는 Node.js + TypeScript 서비스입니다.

## 주요 기능

- `POST /v1/events` 이벤트 수집 API
  - 필수 필드: `site_id`, `session_id`, `event_name`, `ts`, `properties`, `consent_state`
  - 수익 이벤트 표준: `purchase`, `subscription_start`, `donation`
  - 환불 이벤트(`refund`)는 음수 수익으로 처리
- `GET /v1/metrics/pages` 페이지별 EQS 집계
- 퍼널
  - `POST /v1/funnels` 정의 저장
  - `GET /v1/funnels` 정의 조회
  - `POST /v1/funnels/:funnel_id/report` 전환율/drop-off/수익 집계
- 코호트
  - `POST /v1/cohorts`, `GET /v1/cohorts`
  - 조건 DSL 기반 스냅샷: `POST /v1/cohorts/:cohort_id/refresh`, `POST /v1/cohorts/refresh`
  - 일배치 CRON 지원
- 경로(Paths)
  - `POST /v1/paths/query`
  - start_event ~ end_event 상위 N 경로 + 전환/수익 기여

## 구조

```text
event-collector/
├── docs/
│   └── openapi.yaml
├── sql/
│   ├── 001_create_events_raw.sql
│   ├── 002_eqs_aggregation.sql
│   ├── 003_create_analytics_tables.sql
│   ├── 004_funnel_paths_examples.sql
│   └── 005_cohort_refresh_example.sql
├── src/
│   ├── analytics/
│   │   ├── cohort-service.ts
│   │   ├── funnel-service.ts
│   │   ├── path-service.ts
│   │   └── revenue.ts
│   ├── app.ts
│   ├── config.ts
│   ├── jobs/
│   │   ├── cohort-refresh-job.ts
│   │   └── retention-job.ts
│   ├── metrics/
│   │   ├── eqs.ts
│   │   └── service.ts
│   ├── repositories/
│   │   ├── clickhouse-event-repository.ts
│   │   ├── event-repository.ts
│   │   └── in-memory-event-repository.ts
│   ├── schemas/
│   │   ├── cohort-schema.ts
│   │   ├── event-schema.ts
│   │   ├── funnel-schema.ts
│   │   ├── metrics-schema.ts
│   │   └── path-schema.ts
│   └── ...
├── tests/
│   ├── events-api.test.ts
│   ├── eqs-score.test.ts
│   ├── funnel-cohort-paths.test.ts
│   ├── metrics-api.test.ts
│   └── helpers/seed-generator.ts
├── scripts/
│   └── performance-benchmark.ts
└── packages/eqs-web-sdk/
```

## 실행 방법

```bash
cd pulse/event-collector
npm install
cp .env.example .env
npm run dev
```

기본 주소: `http://localhost:8081`

## 마이그레이션 SQL

ClickHouse에서 순서대로 실행:

1. `sql/001_create_events_raw.sql`
2. `sql/002_eqs_aggregation.sql` (EQS 일/배치 집계 필요 시)
3. `sql/003_create_analytics_tables.sql`

참고 템플릿:

- `sql/004_funnel_paths_examples.sql`
- `sql/005_cohort_refresh_example.sql`

## OpenAPI 스펙

- 파일: `docs/openapi.yaml`

## 테스트 실행

```bash
cd pulse/event-collector
npm test
```

포함된 테스트:

- 이벤트 스키마/유효성 (수익 이벤트 필수 속성 포함)
- 동의 상태별 저장 동작
- 중복 삽입 방지(idempotency)
- EQS 계산 엣지케이스
- 퍼널 계산/전환 윈도우/환불 반영
- 코호트 스냅샷 버전 증가
- 경로별 전환/수익 집계

## 성능 벤치마크

```bash
cd pulse/event-collector
npm run test:perf
```

출력 지표:

- 이벤트 삽입 처리량(events/sec)
- 30일 퍼널 쿼리 P95
- 30일 경로 쿼리 P95
- 목표치
  - insert: `>= 1000 events/sec`
  - query p95: `<= 1500ms`

## cURL 최소 예시

### 1) 수익 이벤트 전송

```bash
curl -X POST http://localhost:8081/v1/events \
  -H 'content-type: application/json' \
  -d '{
    "site_id":"demo_site",
    "session_id":"sess-001",
    "event_name":"purchase",
    "ts":"2026-02-14T01:23:45.000Z",
    "properties":{"path":"/checkout","amount":129.99,"currency":"USD","product":"pro","payment_provider":"stripe"},
    "consent_state":"granted",
    "idempotency_key":"purchase-001"
  }'
```

### 2) 퍼널 정의 저장

```bash
curl -X POST http://localhost:8081/v1/funnels \
  -H 'content-type: application/json' \
  -d '{
    "site_id":"demo_site",
    "name":"signup-to-purchase",
    "steps":["page_view","form_submit","purchase"],
    "conversion_window_minutes":30
  }'
```

### 3) 경로 분석

```bash
curl -X POST http://localhost:8081/v1/paths/query \
  -H 'content-type: application/json' \
  -d '{
    "site_id":"demo_site",
    "from":"2026-02-01T00:00:00.000Z",
    "to":"2026-03-01T00:00:00.000Z",
    "start_event":"page_view",
    "end_event":"purchase",
    "top_n":20,
    "sample_rate":0.5
  }'
```
