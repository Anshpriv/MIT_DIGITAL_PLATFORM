"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Sparkles,
  Eye,
  Trophy,
  FileDown,
  Clock,
  TrendingUp,
  Briefcase,
  AlertCircle,
  Loader2,
  LineChart as LineIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

interface AnalyticsSummary {
  totalViews: number;
  recruiterViews: number;
  resumeDownloads: number;
  avgTimeSeconds: number;
  mostViewedProject: { name: string; count: number } | null;
  viewsTimeline: Array<{ date: string; rawDate: string; views: number; recruiterViews: number }>;
  viewerBreakdown: Array<{ name: string; value: number; color: string }>;
  engagementBreakdown: Array<{ name: string; count: number }>;
  recentRecruiterActivity: Array<{ timestamp: string; company: string }>;
}

export default function StudentAnalyticsPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/analytics/summary?studentUid=${user.uid}`);
        const data = await res.json();
        if (res.ok) {
          setSummary(data.summary);
        } else {
          setError(data.error || "Failed to compile profile analytics.");
        }
      } catch (err: any) {
        console.error("Failed to load analytics summary:", err);
        setError(err.message || "An unexpected error occurred loading analytics data.");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [user]);

  const formatAvgTime = (seconds: number) => {
    if (!seconds) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatRelativeTime = (isoStr: string) => {
    const now = new Date();
    const past = new Date(isoStr);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (!mounted) return null;

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-6xl mx-auto w-full text-text-primary">
      {/* Header Title */}
      <div className="border-b border-border pb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <LineIcon className="h-9 w-9 text-primary animate-pulse" />
            Profile Insights
          </h1>
          <p className="text-sm text-text-secondary mt-2">
            Real-time tracking of recruiter activity, profile view counts, and student portfolio engagement.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
          <p className="text-xs text-text-secondary font-mono">Aggregating telemetry logs...</p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 bg-accent-warm/10 border border-accent-warm/20 text-accent-warm p-4 rounded-card text-xs font-mono">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : !summary ? (
        <div className="border border-dashed border-border p-16 text-center rounded-card space-y-2 text-text-secondary">
          <p className="text-sm font-bold">No Analytics Data Available</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Key Metrics Row */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Views Card */}
            <div className="rounded-card border border-border bg-bg-surface p-5 relative overflow-hidden group hover:border-primary/40 transition-colors">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-xs font-mono uppercase tracking-widest text-text-disabled">Total Views</span>
                  <h3 className="text-3xl font-extrabold tracking-tight">{summary.totalViews}</h3>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                  <Eye className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-4 text-[10px] text-primary font-mono">
                <TrendingUp className="h-3 w-3" />
                <span>Views compiled last 30 days</span>
              </div>
            </div>

            {/* Recruiter Views Card */}
            <div className="rounded-card border border-border bg-bg-surface p-5 relative overflow-hidden group hover:border-accent/40 transition-colors">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-xs font-mono uppercase tracking-widest text-text-disabled">Recruiter Views</span>
                  <h3 className="text-3xl font-extrabold tracking-tight text-accent">{summary.recruiterViews}</h3>
                </div>
                <div className="p-3 bg-accent/10 rounded-xl text-accent">
                  <Trophy className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-4 text-[10px] text-accent font-mono">
                <Sparkles className="h-3 w-3" />
                <span>Verified talent acquisition users</span>
              </div>
            </div>

            {/* Resume Downloads */}
            <div className="rounded-card border border-border bg-bg-surface p-5 relative overflow-hidden group hover:border-primary/40 transition-colors">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-xs font-mono uppercase tracking-widest text-text-disabled">Resume Downloads</span>
                  <h3 className="text-3xl font-extrabold tracking-tight">{summary.resumeDownloads}</h3>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                  <FileDown className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-4 text-[10px] text-text-secondary font-mono">
                <span>Total clicks on file link</span>
              </div>
            </div>

            {/* Average Time */}
            <div className="rounded-card border border-border bg-bg-surface p-5 relative overflow-hidden group hover:border-accent-warm/40 transition-colors">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-xs font-mono uppercase tracking-widest text-text-disabled">Avg. Session Time</span>
                  <h3 className="text-3xl font-extrabold tracking-tight text-accent-warm">
                    {formatAvgTime(summary.avgTimeSeconds)}
                  </h3>
                </div>
                <div className="p-3 bg-accent-warm/10 rounded-xl text-accent-warm">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-4 text-[10px] text-text-disabled font-mono">
                <span>Estimated duration on page</span>
              </div>
            </div>
          </div>

          {/* Chart 1: Profile Views Area Chart */}
          <div className="rounded-card border border-border bg-bg-surface p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold font-display">Profile View History</h3>
              <p className="text-xs text-text-secondary mt-1">Daily trend of views and recruiter interest.</p>
            </div>

            <div className="h-[280px] w-full text-xs font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.viewsTimeline} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRecruiter" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D4AA" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#00D4AA" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" vertical={false} />
                  <XAxis dataKey="date" stroke="#8F8F9F" tickLine={false} />
                  <YAxis stroke="#8F8F9F" tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#161622",
                      border: "1px solid #2A2A3A",
                      borderRadius: "8px",
                      color: "#FFFFFF",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    name="Total Views"
                    stroke="#6C63FF"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorViews)"
                  />
                  <Area
                    type="monotone"
                    dataKey="recruiterViews"
                    name="Recruiter Views"
                    stroke="#00D4AA"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRecruiter)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grid of Donut & Bar Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Chart 2: Viewer Breakdown */}
            <div className="rounded-card border border-border bg-bg-surface p-6 flex flex-col justify-between min-h-[350px]">
              <div>
                <h3 className="text-base font-bold font-display">Viewer Demographics</h3>
                <p className="text-xs text-text-secondary mt-1">Breakdown of roles visiting your profile.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
                <div className="h-[180px] w-[180px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.viewerBreakdown}
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {summary.viewerBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3.5 w-full text-xs">
                  {summary.viewerBreakdown.map((entry, idx) => {
                    const total = summary.viewerBreakdown.reduce((sum, item) => sum + item.value, 0);
                    const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                    return (
                      <div key={idx} className="flex justify-between items-center border-b border-border/20 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="font-semibold text-text-secondary">{entry.name}</span>
                        </div>
                        <span className="font-mono font-bold">{entry.value} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Chart 3: Section Clicks */}
            <div className="rounded-card border border-border bg-bg-surface p-6 flex flex-col justify-between min-h-[350px]">
              <div>
                <h3 className="text-base font-bold font-display">Section Click Analysis</h3>
                <p className="text-xs text-text-secondary mt-1">Total clicks on links and action items.</p>
              </div>

              <div className="h-[200px] w-full text-xs font-mono mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.engagementBreakdown} margin={{ left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" vertical={false} />
                    <XAxis dataKey="name" stroke="#8F8F9F" tickLine={false} />
                    <YAxis stroke="#8F8F9F" tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#161622",
                        border: "1px solid #2A2A3A",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="count" fill="#6C63FF" radius={[4, 4, 0, 0]} name="Clicks">
                      {summary.engagementBreakdown.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index % 2 === 0 ? "#6C63FF" : "#00D4AA"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Bottom Highlights Row */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Highlighted Project Card */}
            <div className="rounded-card border border-border bg-bg-surface p-6 space-y-4">
              <h3 className="text-base font-bold font-display">Top Engagement Driver</h3>
              {summary.mostViewedProject ? (
                <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest">
                      Most Visited Project
                    </span>
                    <h4 className="text-base font-bold">{summary.mostViewedProject.name}</h4>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-2xl font-extrabold tracking-tight text-primary font-mono">
                      {summary.mostViewedProject.count}
                    </span>
                    <span className="text-[10px] block font-mono text-text-secondary">Clicks Recieved</span>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-xl border border-border bg-bg-base/30 text-center text-xs text-text-disabled py-10">
                  <Briefcase className="h-6 w-6 text-text-disabled mx-auto mb-2" />
                  No project click events recorded in the last 30 days.
                </div>
              )}
            </div>

            {/* Recent Recruiter Activity */}
            <div className="rounded-card border border-border bg-bg-surface p-6 space-y-4">
              <h3 className="text-base font-bold font-display">Recruiter Activities</h3>
              {summary.recentRecruiterActivity && summary.recentRecruiterActivity.length > 0 ? (
                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                  {summary.recentRecruiterActivity.map((activity, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3.5 border-b border-border/20 pb-3 last:border-b-0 last:pb-0 text-xs"
                    >
                      <div className="h-2 w-2 rounded-full bg-accent animate-ping" />
                      <div className="flex-1 text-text-secondary">
                        A recruiter from{" "}
                        <span className="font-semibold text-text-primary">
                          {activity.company}
                        </span>{" "}
                        viewed your profile.
                      </div>
                      <span className="text-[10px] font-mono text-text-disabled">
                        {formatRelativeTime(activity.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 rounded-xl border border-border bg-bg-base/30 text-center text-xs text-text-disabled py-10">
                  <Trophy className="h-6 w-6 text-text-disabled mx-auto mb-2" />
                  No recruiter visits recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
