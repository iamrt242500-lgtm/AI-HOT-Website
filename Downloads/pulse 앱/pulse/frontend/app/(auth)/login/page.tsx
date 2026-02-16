"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/app");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      router.replace("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[400px] space-y-8 text-slate-900 dark:text-slate-100">
      <header className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-xl mb-6 shadow-lg shadow-primary/20">
          <span className="material-icons-round text-white text-3xl">insights</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Pulse</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Professional Revenue Dashboard
        </p>
      </header>

      <main className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Log in</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Access your account to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder="name@company.com"
              required
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder="Enter your password"
              required
              minLength={8}
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <span className="material-icons-round text-red-500 text-sm">error</span>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-white py-4 rounded-xl font-semibold shadow-lg shadow-primary/25 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-sm text-center text-slate-500 dark:text-slate-400">
          New here?{" "}
          <Link href="/signup" className="text-primary font-semibold hover:underline">
            Create account
          </Link>
        </p>
      </main>
    </div>
  );
}
