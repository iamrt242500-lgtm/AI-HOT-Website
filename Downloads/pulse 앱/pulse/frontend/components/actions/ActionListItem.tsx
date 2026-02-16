"use client";

import { ActionItem } from "@/lib/hooks/useActions";

interface ActionListItemProps {
  action: ActionItem;
  completed: boolean;
  onComplete: () => void;
  onClick: () => void;
}

const PRIORITY_CONFIG: Record<
  number,
  { label: string; color: string; bg: string; icon: string }
> = {
  1: {
    label: "높음",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20",
    icon: "priority_high",
  },
  2: {
    label: "보통",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
    icon: "remove",
  },
  3: {
    label: "낮음",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20",
    icon: "arrow_downward",
  },
};

export default function ActionListItem({
  action,
  completed,
  onComplete,
  onClick,
}: ActionListItemProps) {
  const priority = PRIORITY_CONFIG[action.priority] ?? PRIORITY_CONFIG[3];

  return (
    <div
      className={`bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark p-4 transition-all ${
        completed ? "opacity-50" : "active:scale-[0.98]"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Complete checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            completed
              ? "bg-green-500 border-green-500"
              : "border-slate-300 dark:border-slate-600 hover:border-primary"
          }`}
          aria-label={completed ? "완료 취소" : "완료 처리"}
        >
          {completed && (
            <span className="material-icons-round text-white text-xs">
              check
            </span>
          )}
        </button>

        {/* Content area - clickable for detail */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
          <div className="flex items-center gap-2 mb-1">
            {/* Priority badge */}
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${priority.bg} ${priority.color}`}
            >
              <span className="material-icons-round text-[12px]">
                {priority.icon}
              </span>
              {priority.label}
            </span>
          </div>

          <h3
            className={`text-sm font-semibold mb-1 ${
              completed ? "line-through text-slate-400" : ""
            }`}
          >
            {action.title}
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
            {action.reason}
          </p>

          {action.target_page_url && (
            <p className="text-[11px] text-primary mt-1.5 truncate">
              {action.target_page_url}
            </p>
          )}
        </div>

        {/* Arrow for detail */}
        <span className="material-icons-round text-slate-300 dark:text-slate-600 text-lg mt-1 flex-shrink-0">
          chevron_right
        </span>
      </div>
    </div>
  );
}
