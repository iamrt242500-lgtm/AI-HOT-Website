"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    name: "Home",
    icon: "dashboard",
    path: "/app/home",
  },
  {
    name: "Pages",
    icon: "description",
    path: "/app/pages",
  },
  {
    name: "Actions",
    icon: "bolt",
    path: "/app/actions",
  },
  {
    name: "Settings",
    icon: "settings",
    path: "/app/settings",
  },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-background-light dark:bg-background-dark border-t border-slate-200 dark:border-border-dark px-6 pt-2 flex justify-between items-center z-50 max-w-md mx-auto"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.path;
        return (
          <Link
            key={tab.path}
            href={tab.path}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive
                ? "text-primary"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <span className="material-icons-round">{tab.icon}</span>
            <span className="text-[10px] font-medium">{tab.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
