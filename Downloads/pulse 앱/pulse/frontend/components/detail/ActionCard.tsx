"use client";

import { PageAction } from "@/lib/hooks/usePageDetail";

interface ActionCardProps {
  action: PageAction;
}

export default function ActionCard({ action }: ActionCardProps) {
  return (
    <div className="bg-gradient-to-br from-primary/5 to-transparent rounded-xl border border-primary/20 p-4">
      <div className="flex items-start gap-3">
        <span className="material-icons-round text-primary text-xl mt-0.5">
          lightbulb
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {action.title}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {action.reason}
          </p>
        </div>
      </div>
    </div>
  );
}
