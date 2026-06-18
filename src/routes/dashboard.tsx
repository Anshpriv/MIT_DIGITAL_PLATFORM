import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Sidebar } from "@/components/dashboard/Sidebar";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <AuthGuard requireRole="student">
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="md:pl-[240px]">
          <div className="mx-auto max-w-[1280px] px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}