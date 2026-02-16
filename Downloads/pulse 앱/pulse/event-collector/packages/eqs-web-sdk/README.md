# @pulse/eqs-web-sdk

브라우저에서 Engagement Quality Score(EQS) 이벤트를 퍼스트파티로 수집하는 SDK입니다.

## 설치

```bash
npm install @pulse/eqs-web-sdk
```

## 빠른 사용법 (SPA/Next.js 포함)

```ts
import { initPulseEqs } from "@pulse/eqs-web-sdk";

const tracker = initPulseEqs({
  siteId: "site_123",
  endpoint: "https://collector.example.com/v1/events",
  consentState: "granted",
  enableSpaRouting: true,
  heartbeatMs: 5000,
});

// 필요 시 동의 상태 갱신
tracker.setConsentState("denied");
```

## `<script>` 삽입 방식

```html
<script type="module">
  import { initPulseEqs } from "/node_modules/@pulse/eqs-web-sdk/dist/index.js";

  initPulseEqs({
    siteId: "site_123",
    endpoint: "https://collector.example.com/v1/events",
    consentState: "granted",
    enableSpaRouting: true
  });
</script>
```

또는 전역 방식:

```html
<script type="module" src="/node_modules/@pulse/eqs-web-sdk/dist/global.js"></script>
<script>
  window.PulseEQS.init({
    siteId: "site_123",
    endpoint: "https://collector.example.com/v1/events"
  });
</script>
```

## 자동 수집 이벤트

- `page_view`
- `scroll_depth_0`, `scroll_depth_25`, `scroll_depth_50`, `scroll_depth_75`, `scroll_depth_100`
- `active_attention_ms` (가시 탭 + 사용자 활동 기반 heartbeat)
- `outbound_click`
- `file_download`
- `form_start`
- `form_submit`

## 개인정보 보호

SDK는 다음 properties만 전송합니다.

- `path`
- `referrer`
- `utm_*`
- `device`
- `country` (옵션)

DOM 텍스트, 입력값, 민감정보는 전송하지 않습니다.

## 테스트

```bash
npm run build
npm run test:unit
npm run test:e2e
```
