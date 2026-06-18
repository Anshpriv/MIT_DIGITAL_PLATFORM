"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  requireRole?: "student" | "recruiter";
}

export function AuthGuard({ children, requireRole }: Props) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (requireRole && role && role !== requireRole) {
      router.push(role === "student" ? "/dashboard" : "/recruiter/dashboard");
    }
  }, [user, role, loading, requireRole, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-text-secondary text-sm font-mono">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}