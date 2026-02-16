"use client";

import { ActionItem } from "@/lib/hooks/useActions";

interface ActionDetailModalProps {
  action: ActionItem;
  completed: boolean;
  onComplete: () => void;
  onClose: () => void;
}

const PRIORITY_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  1: {
    label: "높음 — 즉시 실행",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-500/10",
  },
  2: {
    label: "보통 — 이번 주 실행",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10",
  },
  3: {
    label: "낮음 — 참고용",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
  },
};

export default function ActionDetailModal({
  action,
  completed,
  onComplete,
  onClose,
}: ActionDetailModalProps) {
  const priority = PRIORITY_LABELS[action.priority] ?? PRIORITY_LABELS[3];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-auto bg-white dark:bg-card-dark rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-border-dark shadow-xl animate-slide-up">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div
              className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold ${priority.bg} ${priority.color}`}
            >
              우선순위: {priority.label}
            </div>
            <button
              onClick={onClose}
              className="p-1 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <span className="material-icons-round text-xl">close</span>
            </button>
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold mb-3">{action.title}</h2>

          {/* Reason */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              분석 근거
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {action.reason}
            </p>
          </div>

          {/* Target URL */}
          {action.target_page_url && (
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                대상 페이지
              </h4>
              <p className="text-sm text-primary break-all">
                {action.target_page_url}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-border-dark text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              닫기
            </button>
            <button
              onClick={() => {
                onComplete();
                onClose();
              }}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
                completed
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  : "bg-primary text-white hover:bg-primary/90"
              }`}
              disabled={completed}
            >
              {completed ? (
                <span className="flex items-center justify-center gap-1">
                  <span className="material-icons-round text-base">
                    check_circle
                  </span>
                  완료됨
                </span>
              ) : (
                "완료 처리"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
