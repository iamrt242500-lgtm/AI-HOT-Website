import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";

interface CapturedEvent {
  site_id: string;
  event_name: string;
  ts: string;
  properties: Record<string, unknown>;
  consent_state: string;
}

let server: ReturnType<typeof createServer>;
let baseUrl = "";
const capturedEvents: CapturedEvent[] = [];

function getContentType(filePath: string): string {
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  return "text/plain; charset=utf-8";
}

test.beforeAll(async () => {
  const testFile = fileURLToPath(import.meta.url);
  const root = path.resolve(path.dirname(testFile), "..");
  const distDir = path.join(root, "dist");

  server = createServer(async (req, res) => {
    const method = req.method || "GET";
    const requestPath = req.url || "/";

    if (requestPath === "/v1/events" && method === "POST") {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      req.on("end", () => {
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as CapturedEvent;
          capturedEvents.push(parsed);
        } catch {
          // ignore malformed payload in test harness
        }

        res.statusCode = 202;
        res.setHeader("content-type", "application/json");
        res.end('{"status":"ok"}');
      });
      return;
    }

    if (requestPath === "/") {
      const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>EQS SDK E2E</title>
    <style>
      body { margin: 0; }
      .spacer { height: 3200px; }
    </style>
  </head>
  <body>
    <a id="outbound" href="https://example.com/" target="_blank" rel="noreferrer" onclick="event.preventDefault()">outbound</a>
    <a id="download" href="/assets/report.pdf" onclick="event.preventDefault()">download</a>
    <form id="lead-form"><input id="email" name="email" /></form>
    <div class="spacer"></div>

    <script type="module">
      import { initPulseEqs } from '/dist/index.js';

      window.__eqs = initPulseEqs({
        siteId: 'e2e-site',
        endpoint: '/v1/events',
        consentState: 'granted',
        heartbeatMs: 200,
        idleTimeoutMs: 1500,
        useBeacon: false,
        enableSpaRouting: true,
      });
    </script>
  </body>
</html>`;

      res.statusCode = 200;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(html);
      return;
    }

    if (requestPath.startsWith("/dist/")) {
      const filePath = path.join(distDir, requestPath.replace("/dist/", ""));

      try {
        const source = await readFile(filePath);
        res.statusCode = 200;
        res.setHeader("content-type", getContentType(filePath));
        res.end(source);
      } catch {
        res.statusCode = 404;
        res.end("not found");
      }
      return;
    }

    res.statusCode = 404;
    res.end("not found");
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") {
        baseUrl = `http://127.0.0.1:${address.port}`;
      }
      resolve();
    });
  });
});

test.afterAll(async () => {
  if (!server) return;
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test.beforeEach(() => {
  capturedEvents.length = 0;
});

test("sends key engagement events including scroll and attention", async ({ page, browser }) => {
  await page.goto(baseUrl);

  await page.waitForTimeout(350);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);

  await page.click("#outbound");
  await page.click("#download");
  await page.focus("#email");
  await page.dispatchEvent("#lead-form", "submit");

  const bgPage = await browser.newPage();
  await bgPage.goto("about:blank");
  await bgPage.bringToFront();
  await page.waitForTimeout(300);
  await page.bringToFront();
  await page.waitForTimeout(300);
  await bgPage.close();

  const names = capturedEvents.map((event) => event.event_name);

  expect(names).toContain("page_view");
  expect(names).toContain("scroll_depth_25");
  expect(names).toContain("scroll_depth_100");
  expect(names).toContain("active_attention_ms");
  expect(names).toContain("outbound_click");
  expect(names).toContain("file_download");
  expect(names).toContain("form_start");
  expect(names).toContain("form_submit");

  const payload = capturedEvents.find((event) => event.event_name === "page_view");
  expect(payload).toBeTruthy();
  expect(payload?.properties).toHaveProperty("path");
  expect(payload?.properties).toHaveProperty("referrer");
  expect(payload?.properties).toHaveProperty("device");

  expect(payload?.properties).not.toHaveProperty("dom_text");
  expect(payload?.properties).not.toHaveProperty("input_value");
});
