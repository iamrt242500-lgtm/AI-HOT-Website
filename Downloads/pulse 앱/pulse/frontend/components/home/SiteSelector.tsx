"use client";

import { useSite } from "@/lib/site-context";

export default function SiteSelector() {
  const { sites, currentSite, setCurrentSite, loading } = useSite();

  if (loading || sites.length === 0) return null;

  // Single site — no dropdown needed
  if (sites.length === 1) {
    return (
      <span className="text-sm font-semibold truncate max-w-[160px]">
        {currentSite?.name ?? sites[0].name}
      </span>
    );
  }

  return (
    <div className="relative">
      <select
        value={currentSite?.id ?? ""}
        onChange={(e) => {
          const site = sites.find((s) => s.id === Number(e.target.value));
          if (site) setCurrentSite(site);
        }}
        className="appearance-none bg-transparent text-sm font-semibold pr-6 cursor-pointer focus:outline-none truncate max-w-[160px]"
      >
        {sites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.name}
          </option>
        ))}
      </select>
      <span className="material-icons-round text-sm absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        expand_more
      </span>
    </div>
  );
}
