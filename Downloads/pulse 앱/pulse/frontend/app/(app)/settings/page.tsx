"use client";

import { useState } from "react";
import { useSite } from "@/lib/site-context";
import {
  useConnections,
  ConnectionItem,
} from "@/lib/hooks/useConnections";
import { api } from "@/lib/api";

// ── Provider display helpers ──────────────────────────────────────────
const PROVIDER_META: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  ga4: {
    label: "Google Analytics 4",
    icon: "analytics",
    color: "text-orange-500",
  },
  adsense: {
    label: "Google AdSense",
    icon: "monetization_on",
    color: "text-green-500",
  },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── Connection Card ───────────────────────────────────────────────────
function ConnectionCard({
  conn,
  onDisconnect,
}: {
  conn: ConnectionItem;
  onDisconnect: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const meta = PROVIDER_META[conn.provider] ?? {
    label: conn.provider,
    icon: "link",
    color: "text-slate-500",
  };

  return (
    <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark p-4">
      <div className="flex items-start gap-3">
        <span
          className={`material-icons-round text-2xl ${meta.color} mt-0.5`}
        >
          {meta.icon}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold">{meta.label}</h3>
          <p className="text-xs text-slate-500 truncate">
            {conn.property_name || conn.property_id || "연결됨"}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            연결일: {formatDate(conn.connected_at)}
            {conn.last_synced_at && (
              <> · 마지막 동기화: {formatDate(conn.last_synced_at)}</>
            )}
          </p>
        </div>
        <div>
          {confirming ? (
            <div className="flex gap-1">
              <button
                onClick={() => {
                  onDisconnect();
                  setConfirming(false);
                }}
                className="px-2 py-1 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-500/10 rounded-lg"
              >
                확인
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="px-2 py-1 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-lg"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-500/10 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
            >
              해제
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────────────
export default function SettingsPage() {
  const { currentSite, sites, fetchSites, setCurrentSite } = useSite();
  const {
    data: connections,
    loading: connLoading,
    disconnect,
  } = useConnections(currentSite?.id ?? null);

  // Local state toggles
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  // Site delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDisconnect = async (connectionId: number) => {
    try {
      setDisconnectError(null);
      await disconnect(connectionId);
    } catch (err) {
      setDisconnectError(
        err instanceof Error ? err.message : "연결 해제 실패"
      );
    }
  };

  const handleDeleteSite = async () => {
    if (!currentSite || deleteConfirmText !== currentSite.name) return;

    try {
      setDeleting(true);
      await api.delete(`/api/v1/sites/${currentSite.id}`);
      // Refresh sites and switch to another site
      await fetchSites();
      const remaining = sites.filter((s) => s.id !== currentSite.id);
      if (remaining.length > 0) {
        setCurrentSite(remaining[0]);
      }
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
    } catch {
      setDisconnectError("사이트 삭제에 실패했습니다");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 ios-blur border-b border-primary/10 -mx-6 px-6 py-4">
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {currentSite?.name ?? "사이트 없음"}
        </p>
      </header>

      {/* ── Connected Accounts ──────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          연결된 계정
        </h2>

        {connLoading && (
          <div className="flex items-center justify-center py-6">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {disconnectError && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3">
            <p className="text-xs text-red-600 dark:text-red-400">
              {disconnectError}
            </p>
          </div>
        )}

        {!connLoading && connections.length === 0 && (
          <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-slate-200 dark:border-border-dark text-center">
            <span className="material-icons-round text-4xl text-slate-300 dark:text-slate-700 mb-2 block">
              link_off
            </span>
            <p className="text-sm text-slate-500">연결된 계정이 없습니다</p>
          </div>
        )}

        {connections.map((conn) => (
          <ConnectionCard
            key={conn.id}
            conn={conn}
            onDisconnect={() => handleDisconnect(conn.id)}
          />
        ))}
      </section>

      {/* ── Sync Schedule ───────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          동기화 설정
        </h2>
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark p-4">
          <div className="flex items-center gap-3">
            <span className="material-icons-round text-2xl text-primary">
              sync
            </span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">데이터 동기화 주기</h3>
              <p className="text-xs text-slate-500">매일 1회 자동 동기화</p>
            </div>
            <span className="px-3 py-1 text-xs font-semibold text-primary bg-primary/10 rounded-lg">
              자동
            </span>
          </div>
        </div>
      </section>

      {/* ── Notification Preferences ────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          알림 설정
        </h2>
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark p-4">
          <div className="flex items-center gap-3">
            <span className="material-icons-round text-2xl text-primary">
              email
            </span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">주간 리포트 이메일</h3>
              <p className="text-xs text-slate-500">
                매주 월요일 주간 성과 요약
              </p>
            </div>
            {/* Toggle switch */}
            <button
              onClick={() => setWeeklyReport(!weeklyReport)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                weeklyReport ? "bg-primary" : "bg-slate-300 dark:bg-slate-600"
              }`}
              role="switch"
              aria-checked={weeklyReport}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  weeklyReport ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* ── Danger Zone ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-red-400 uppercase tracking-wider">
          위험 구역
        </h2>
        <div className="bg-white dark:bg-card-dark rounded-xl border-2 border-red-200 dark:border-red-500/30 p-4">
          <div className="flex items-start gap-3">
            <span className="material-icons-round text-2xl text-red-500 mt-0.5">
              warning
            </span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">
                사이트 삭제
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                사이트를 삭제하면 모든 연결, 메트릭 데이터가 영구적으로
                삭제됩니다. 이 작업은 되돌릴 수 없습니다.
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="mt-3 px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                >
                  사이트 삭제하기
                </button>
              ) : (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
                    확인을 위해 사이트 이름을 입력하세요:&nbsp;
                    <span className="font-mono bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded">
                      {currentSite?.name}
                    </span>
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="사이트 이름 입력"
                    className="w-full px-3 py-2 text-sm border border-red-200 dark:border-red-500/30 rounded-lg bg-white dark:bg-background-dark focus:outline-none focus:ring-2 focus:ring-red-500/40"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteSite}
                      disabled={
                        deleting ||
                        deleteConfirmText !== currentSite?.name
                      }
                      className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {deleting ? "삭제 중..." : "영구 삭제"}
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText("");
                      }}
                      className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-xl"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* App info */}
      <div className="text-center py-4">
        <p className="text-[11px] text-slate-400">Pulse v1.0.0 · MVP</p>
      </div>
    </div>
  );
}
