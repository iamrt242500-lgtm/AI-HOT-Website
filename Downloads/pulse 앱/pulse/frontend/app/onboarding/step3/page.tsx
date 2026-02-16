"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSite } from "@/lib/site-context";
import { api, ApiError, ApiListResponse } from "@/lib/api";

interface AdSenseAccount {
  account_id: string;
  account_name: string;
  display_name: string;
}

interface Connection {
  id: number;
  site_id: number;
  provider: "ga4" | "adsense";
  property_id?: string;
  property_name?: string;
}

export default function OnboardingStep3() {
  const router = useRouter();
  const { currentSite } = useSite();
  const currentSiteId = currentSite?.id;

  const [accounts, setAccounts] = useState<AdSenseAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AdSenseAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingAccounts, setFetchingAccounts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      setFetchingAccounts(true);
      setError(null);
      try {
        const accountList = await api.get<AdSenseAccount[]>(
          "/api/v1/connections/adsense/accounts"
        );
        setAccounts(accountList);

        if (!currentSiteId) {
          return;
        }

        const connections = await api.get<ApiListResponse<Connection>>(
          `/api/v1/connections?site_id=${currentSiteId}`
        );
        const adsenseConnection = connections.data.find(
          (connection) => connection.provider === "adsense"
        );

        if (adsenseConnection) {
          setIsConnected(true);
          const connectedAccount = accountList.find(
            (account) => account.account_id === adsenseConnection.property_id
          );
          if (connectedAccount) {
            setSelectedAccount(connectedAccount);
          }
        }
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Failed to load AdSense accounts";
        setError(message);
      } finally {
        setFetchingAccounts(false);
      }
    };

    bootstrap();
  }, [currentSiteId]);

  const handleConnect = async () => {
    if (!currentSite || !selectedAccount) return;

    try {
      setLoading(true);
      setError(null);

      await api.post<Connection>("/api/v1/connections", {
        site_id: currentSite.id,
        provider: "adsense",
        property_id: selectedAccount.account_id,
        property_name: selectedAccount.account_name,
      });

      setIsConnected(true);

      setTimeout(() => {
        router.push("/app/home");
      }, 1000);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to connect AdSense";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.push("/app/home");
  };

  if (!currentSite) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No site selected. Please complete Step 1 first.</p>
          <button
            onClick={() => router.push("/onboarding/step1")}
            className="mt-4 text-blue-600 hover:underline"
          >
            Go to Step 1
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-bold text-gray-900">Connect Google AdSense</h1>
          <p className="text-sm text-gray-500 mt-1">Step 3 of 3</p>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-2">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: "100%" }} />
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="material-icons-round text-green-600 text-2xl">monetization_on</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Google AdSense</h2>
                  <p className="text-sm text-gray-500">Track your ad revenue</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Connect your AdSense account to track revenue data for{" "}
                <strong>{currentSite.name}</strong>.
              </p>
            </div>

            {fetchingAccounts && (
              <div className="py-8 text-center">
                <div className="inline-block w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-600 mt-3">Loading AdSense accounts...</p>
              </div>
            )}

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <span className="material-icons-round text-red-600 text-xl">error</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">Error</p>
                    <p className="text-sm text-red-700 mt-0.5">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {!fetchingAccounts && accounts.length > 0 && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Select AdSense Account
                </label>

                <div className="space-y-2">
                  {accounts.map((account) => (
                    <button
                      key={account.account_id}
                      onClick={() => setSelectedAccount(account)}
                      disabled={isConnected}
                      className={`w-full text-left px-4 py-3 border-2 rounded-lg transition-all ${
                        selectedAccount?.account_id === account.account_id
                          ? "border-green-600 bg-green-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      } ${isConnected ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{account.display_name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{account.account_id}</p>
                        </div>
                        {selectedAccount?.account_id === account.account_id && (
                          <span className="material-icons-round text-green-600">check_circle</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {isConnected && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <span className="material-icons-round text-green-600 text-xl">check_circle</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900">Connected!</p>
                        <p className="text-sm text-green-700 mt-0.5">
                          AdSense account connected successfully. Redirecting to home...
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!isConnected && (
                  <button
                    onClick={handleConnect}
                    disabled={!selectedAccount || loading}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 active:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <span className="material-icons-round text-xl">link</span>
                        Connect AdSense
                      </>
                    )}
                  </button>
                )}

                {isConnected && (
                  <button
                    onClick={() => router.push("/app/home")}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center gap-2"
                  >
                    Go to Dashboard
                    <span className="material-icons-round text-xl">arrow_forward</span>
                  </button>
                )}
              </div>
            )}

            {!fetchingAccounts && accounts.length === 0 && (
              <div className="py-8 text-center">
                <span className="material-icons-round text-gray-400 text-5xl mb-3">inbox</span>
                <p className="text-gray-600">No AdSense accounts available</p>
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
            >
              Skip for now
            </button>
            <p className="text-xs text-gray-500 mt-2">
              You can connect AdSense later in Settings
            </p>
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="material-icons-round text-blue-600 text-xl">info</span>
              <div className="flex-1 text-sm text-blue-900">
                <p className="font-medium mb-1">Almost done!</p>
                <p className="text-blue-700">
                  After connecting AdSense, you will be able to see your revenue metrics and get
                  actionable insights.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
