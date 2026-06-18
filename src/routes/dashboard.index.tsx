import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Eye, Bookmark, Sparkles, Star, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

function completeness(s: ReturnType<typeof useAuth>["studentProfile"]) {
  if (!s) return 0;
  const checks = [
    !!s.name,
    !!s.bio,
    !!s.avatar,
    !!s.branch,
    !!s.graduationYear,
    (s.skills?.length ?? 0) > 0,
    (s.techStack?.length ?? 0) > 0,
    !!s.githubUrl,
    !!s.linkedinUrl,
    !!s.resumeUrl,
    (s.projects?.length ?? 0) > 0,
    (s.achievements?.length ?? 0) > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function DashboardHome() {
  const { studentProfile } = useAuth();
  const pct = completeness(studentProfile);

  const stats = [
    { label: "Profile views", value: 0, icon: Eye },
    { label: "Recruiter saves", value: 0, icon: Bookmark },
    { label: "Portfolio score", value: studentProfile?.portfolioScore ?? "—", icon: Sparkles },
    { label: "GitHub stars", value: studentProfile?.githubData?.totalStars ?? "—", icon: Star },
  ];

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">
            Welcome back, {studentProfile?.name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep your profile sharp. Recruiters are watching.
          </p>
        </div>
      </header>

      <section className="card-hub p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono uppercase text-muted-foreground">Profile completion</div>
            <div className="mt-1 font-display text-3xl font-bold">{pct}%</div>
          </div>
          <Link to="/dashboard/profile" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm hover:border-primary transition-colors">
            Edit profile <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-elevated">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card-hub p-5">
            <s.icon className="h-4 w-4 text-primary" />
            <div className="mt-3 font-display text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="card-hub p-6">
        <h2 className="font-display text-lg font-bold">Recent activity</h2>
        <div className="mt-4 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No activity yet. Complete your profile to start showing up in recruiter searches.
        </div>
      </section>
    </div>
  );
}