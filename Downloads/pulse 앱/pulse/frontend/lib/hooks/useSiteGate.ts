"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useSite } from "@/lib/site-context";

export function useSiteGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { sites, loading: sitesLoading } = useSite();

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (sitesLoading) return;

    if (sites.length === 0) {
      router.replace("/onboarding/step1");
      return;
    }

    if (pathname === "/app") {
      router.replace("/app/home");
    }
  }, [authLoading, isAuthenticated, pathname, router, sites.length, sitesLoading]);

  const ready =
    !authLoading &&
    isAuthenticated &&
    !sitesLoading &&
    sites.length > 0 &&
    pathname !== "/app";

  return { ready, authLoading, sitesLoading };
}
