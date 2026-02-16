import type { Metadata } from "next";
import Link from "next/link";
import AnalyticsProvider from "./analytics-provider";

export const metadata: Metadata = {
  title: "Pulse EQS Demo",
  description: "Next.js sample site for EQS SDK",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <AnalyticsProvider />
        <header
          style={{
            display: "flex",
            gap: 16,
            padding: 16,
            borderBottom: "1px solid #ddd",
          }}
        >
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
        </header>
        {children}
      </body>
    </html>
  );
}
