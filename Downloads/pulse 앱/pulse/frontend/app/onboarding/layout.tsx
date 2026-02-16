import { ReactNode } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        {children}
      </div>
    </ProtectedRoute>
  );
}
