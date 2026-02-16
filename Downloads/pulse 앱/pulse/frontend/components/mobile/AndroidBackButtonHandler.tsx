"use client";

import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { usePathname, useRouter } from "next/navigation";

const PRIMARY_APP_ROUTES = new Set(["/app/home", "/app/pages", "/app/actions", "/app/settings"]);
const ONBOARDING_PREFIX = "/onboarding";

export default function AndroidBackButtonHandler() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname) return;
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
      return;
    }

    let throttled = false;
    let cancelled = false;
    let listenerHandle: { remove: () => Promise<void> } | null = null;

    const register = async () => {
      const handle = await CapacitorApp.addListener("backButton", () => {
        if (throttled) return;
        throttled = true;

        try {
          if (pathname.startsWith(ONBOARDING_PREFIX)) {
            router.replace("/app/home");
            return;
          }

          if (!PRIMARY_APP_ROUTES.has(pathname) && pathname !== "/") {
            window.history.back();
            return;
          }

          if (pathname !== "/app/home") {
            router.replace("/app/home");
            return;
          }

          CapacitorApp.minimizeApp();
        } finally {
          window.setTimeout(() => {
            throttled = false;
          }, 120);
        }
      });

      if (cancelled) {
        await handle.remove();
        return;
      }

      listenerHandle = handle;
    };

    void register();

    return () => {
      cancelled = true;
      if (listenerHandle) {
        void listenerHandle.remove();
      }
    };
  }, [pathname, router]);

  return null;
}
