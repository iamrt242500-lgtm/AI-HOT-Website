"use client";

import BottomTabBar from "@/components/layout/BottomTabBar";
import { useSiteGate } from "@/lib/hooks/useSiteGate";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ready } = useSiteGate();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
      <div
        className="max-w-md mx-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)" }}
      >
        {children}
      </div>
      <BottomTabBar />
    </div>
  );
}
