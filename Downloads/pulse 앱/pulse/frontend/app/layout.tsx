import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { SiteProvider } from "@/lib/site-context";
import AndroidBackButtonHandler from "@/components/mobile/AndroidBackButtonHandler";

export const metadata: Metadata = {
  title: "Pulse - Revenue Dashboard",
  description: "Professional Revenue Dashboard for Ad-driven Sites",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1392ec",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Round"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-display">
        <AuthProvider>
          <SiteProvider>
            <AndroidBackButtonHandler />
            {children}
          </SiteProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
