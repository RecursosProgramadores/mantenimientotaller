import { Navigate } from "@tanstack/react-router";
import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { AppLoadingScreen } from "./AppLoadingScreen";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
