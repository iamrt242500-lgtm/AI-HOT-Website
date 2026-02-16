export default function HomePage() {
  return (
    <main style={{ padding: 24, maxWidth: 860 }}>
      <h1>Pulse EQS Demo</h1>
      <p>Scroll, click outbound/download links, and submit the form to generate events.</p>

      <p>
        <a href="https://example.com" target="_blank" rel="noreferrer">
          Outbound Link (example.com)
        </a>
      </p>

      <p>
        <a href="/files/demo-brochure.pdf">File Download (PDF)</a>
      </p>

      <form action="#" style={{ display: "grid", gap: 12, maxWidth: 320 }}>
        <label>
          Email
          <input type="email" name="email" placeholder="you@example.com" />
        </label>
        <button type="submit">Submit</button>
      </form>

      <div style={{ height: 2600, background: "linear-gradient(#fff, #f4f4f4)" }} />
    </main>
  );
}
