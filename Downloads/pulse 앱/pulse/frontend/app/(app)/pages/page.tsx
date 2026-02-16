"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSite } from "@/lib/site-context";
import { useTopPages, RangeDays, SortField } from "@/lib/hooks/useTopPages";
import RangeFilter from "@/components/home/RangeFilter";
import SortSelector from "@/components/pages/SortSelector";
import PageRow from "@/components/pages/PageRow";

const LIMIT = 20;

function PagesPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentSite, sites, loading: sitesLoading } = useSite();

  // ── Restore state from URL query ────────────────────────────────
  const initialRange = ([7, 30, 90].includes(Number(searchParams.get("range")))
    ? Number(searchParams.get("range"))
    : 7) as RangeDays;
  const initialSort = (["revenue", "rpm", "pageviews"].includes(
    searchParams.get("sort") ?? ""
  )
    ? searchParams.get("sort")!
    : "revenue") as SortField;
  const initialSearch = searchParams.get("q") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page")) || 1);

  const [range, setRange] = useState<RangeDays>(initialRange);
  const [sort, setSort] = useState<SortField>(initialSort);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [page, setPage] = useState(initialPage);
  const previousSearchRef = useRef(initialSearch);

  // ── Debounce search ──────────────────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      const hasSearchChanged = previousSearchRef.current !== search;
      setDebouncedSearch(search);
      if (hasSearchChanged) {
        setPage(1);
      }
      previousSearchRef.current = search;
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // ── Sync state → URL query ──────────────────────────────────────
  useEffect(() => {
    const listPath = pathname.startsWith("/app/") ? "/app/pages" : "/pages";
    const params = new URLSearchParams();
    if (range !== 7) params.set("range", String(range));
    if (sort !== "revenue") params.set("sort", sort);
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(`${listPath}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [range, sort, debouncedSearch, page, pathname, router]);

  // ── Fetch data ──────────────────────────────────────────────────
  const { items, meta, loading, error } = useTopPages(
    currentSite?.id ?? null,
    range,
    sort,
    debouncedSearch,
    page,
    LIMIT,
  );

  const totalPages = meta ? Math.ceil(meta.total / LIMIT) : 1;

  // ── Sites loading ───────────────────────────────────────────────
  if (sitesLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  // ── No sites ────────────────────────────────────────────────────
  if (sites.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <span className="material-icons-round text-5xl text-slate-300 dark:text-slate-600">
          add_circle_outline
        </span>
        <p className="text-sm text-slate-500">
          No sites registered yet. Add a site in Onboarding.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Sticky Header ──────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-background-light/80 dark:bg-background-dark/80 ios-blur border-b border-primary/10 px-4 pt-4 pb-3 space-y-3">
        <h1 className="text-lg font-bold">Top Revenue Pages</h1>

        {/* Search */}
        <div className="relative">
          <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
            search
          </span>
          <input
            type="text"
            placeholder="Search by URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm border-none outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-primary/30"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <span className="material-icons-round text-slate-400 text-lg">
                close
              </span>
            </button>
          )}
        </div>

        {/* Filters row */}
        <div className="flex items-center justify-between gap-2">
          <RangeFilter value={range} onChange={(r) => { setRange(r); setPage(1); }} />
          <SortSelector value={sort} onChange={(s) => { setSort(s); setPage(1); }} />
        </div>
      </header>

      {/* ── Content area ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        {/* Loading skeleton */}
        {loading && items.length === 0 && (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark p-4 animate-pulse"
              >
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
                <div className="flex gap-4">
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-16" />
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-12" />
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-14 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center space-y-2">
            <span className="material-icons-round text-red-400 text-3xl">
              error_outline
            </span>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <span className="material-icons-round text-4xl text-slate-300 dark:text-slate-600">
              search_off
            </span>
            <p className="text-sm text-slate-500">
              {debouncedSearch
                ? `No pages matching "${debouncedSearch}"`
                : "No page data for this period"}
            </p>
          </div>
        )}

        {/* Page rows */}
        {!error &&
          items.map((item) => (
            <PageRow
              key={item.page_key}
              item={item}
              onClick={() =>
                router.push(
                  `/app/page-detail?page_key=${encodeURIComponent(item.page_key)}&site_id=${currentSite?.id}&range=${range}`
                )
              }
            />
          ))}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 disabled:opacity-40 transition-opacity"
            >
              <span className="material-icons-round text-sm">chevron_left</span>
              Prev
            </button>

            <span className="text-xs text-slate-500">
              {page} / {totalPages}
              {meta && (
                <span className="text-slate-400 ml-1">({meta.total} pages)</span>
              )}
            </span>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 disabled:opacity-40 transition-opacity"
            >
              Next
              <span className="material-icons-round text-sm">chevron_right</span>
            </button>
          </div>
        )}

        {/* Loading overlay for paginated fetches */}
        {loading && items.length > 0 && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        )}
      </div>
    </div>
  );
}

function PagesPageFallback() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  );
}

export default function PagesPage() {
  return (
    <Suspense fallback={<PagesPageFallback />}>
      <PagesPageContent />
    </Suspense>
  );
}
