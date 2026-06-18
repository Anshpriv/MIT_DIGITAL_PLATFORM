import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, User, FolderGit2, Trophy, Github, Sparkles, Clock, BarChart3, Settings,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  soon?: boolean;
};

const items: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/profile", label: "My Profile", icon: User },
  { to: "/dashboard/projects", label: "Projects", icon: FolderGit2, soon: true },
  { to: "/dashboard/achievements", label: "Achievements", icon: Trophy, soon: true },
  { to: "/dashboard/github", label: "GitHub", icon: Github, soon: true },
  { to: "/dashboard/portfolio-score", label: "Portfolio Score", icon: Sparkles, soon: true },
  { to: "/dashboard/timeline", label: "Timeline", icon: Clock, soon: true },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3, soon: true },
  { to: "/dashboard/settings", label: "Settings", icon: Settings, soon: true },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { studentProfile, signOut } = useAuth();

  return (
    <aside className="hidden md:flex md:w-[240px] md:flex-col md:fixed md:inset-y-0 md:border-r md:border-border md:bg-sidebar">
      <div className="flex h-16 items-center gap-2 px-5 border-b border-border">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-primary-dark" />
        <span className="font-display text-sm font-bold">Talent Hub</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {items.map((it) => {
          const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
          return (
            <Link
              key={it.to}
              to={it.to as never}
              className={`group relative mx-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : it.soon
                  ? "text-muted-foreground/50 cursor-not-allowed"
                  : "text-muted-foreground hover:text-foreground hover:bg-elevated"
              }`}
              onClick={(e) => { if (it.soon) e.preventDefault(); }}
            >
              {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />}
              <it.icon className="h-4 w-4" />
              <span>{it.label}</span>
              {it.soon && <span className="ml-auto text-[10px] font-mono uppercase">soon</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-white">
            {studentProfile?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{studentProfile?.name ?? "Student"}</div>
            <button onClick={() => signOut()} className="text-xs text-muted-foreground hover:text-accent-warm">Sign out</button>
          </div>
        </div>
      </div>
    </aside>
  );
}