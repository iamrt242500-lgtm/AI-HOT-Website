"use client";

import { useState } from "react";
import { useSite } from "@/lib/site-context";
import { useActions, ActionItem, RangeDays } from "@/lib/hooks/useActions";
import RangeFilter from "@/components/home/RangeFilter";
import ActionListItem from "@/components/actions/ActionListItem";
import ActionDetailModal from "@/components/actions/ActionDetailModal";

export default function ActionsPage() {
  const { currentSite } = useSite();
  const [range, setRange] = useState<RangeDays>(7);
  const { data: actions, loading, error } = useActions(
    currentSite?.id ?? null,
    range
  );

  // Local completed state (persists only during session)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);

  const toggleComplete = (actionId: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(actionId)) {
        next.delete(actionId);
      } else {
        next.add(actionId);
      }
      return next;
    });
  };

  const pendingActions = actions.filter((a) => !completedIds.has(a.action_id));
  const completedActions = actions.filter((a) => completedIds.has(a.action_id));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 ios-blur border-b border-primary/10 -mx-6 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Today&apos;s Actions</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {pendingActions.length}개 남음 · {completedActions.length}개 완료
            </p>
          </div>
          <RangeFilter value={range} onChange={setRange} />
        </div>
      </header>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && actions.length === 0 && (
        <div className="bg-white dark:bg-card-dark p-8 rounded-xl border border-slate-200 dark:border-border-dark text-center">
          <span className="material-icons-round text-5xl text-slate-300 dark:text-slate-700 mb-3 block">
            task_alt
          </span>
          <h2 className="text-base font-semibold mb-1">액션이 없습니다</h2>
          <p className="text-xs text-slate-500">
            데이터가 쌓이면 맞춤 추천 액션이 표시됩니다
          </p>
        </div>
      )}

      {/* Pending Actions */}
      {!loading && pendingActions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            실행 대기 ({pendingActions.length})
          </h2>
          {pendingActions.map((action) => (
            <ActionListItem
              key={action.action_id}
              action={action}
              completed={false}
              onComplete={() => toggleComplete(action.action_id)}
              onClick={() => setSelectedAction(action)}
            />
          ))}
        </section>
      )}

      {/* Completed Actions */}
      {!loading && completedActions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            완료됨 ({completedActions.length})
          </h2>
          {completedActions.map((action) => (
            <ActionListItem
              key={action.action_id}
              action={action}
              completed={true}
              onComplete={() => toggleComplete(action.action_id)}
              onClick={() => setSelectedAction(action)}
            />
          ))}
        </section>
      )}

      {/* Detail Modal */}
      {selectedAction && (
        <ActionDetailModal
          action={selectedAction}
          completed={completedIds.has(selectedAction.action_id)}
          onComplete={() => toggleComplete(selectedAction.action_id)}
          onClose={() => setSelectedAction(null)}
        />
      )}
    </div>
  );
}
