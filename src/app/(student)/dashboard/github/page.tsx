"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import {
  Github,
  ExternalLink,
  RefreshCw,
  GitBranch,
  Star,
  Award,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Compass,
  Search,
} from "lucide-react";
import Link from "next/link";
import GitHubStats from "@/components/github/GitHubStats";

export default function GitHubAnalyticsPage() {
  const { studentProfile } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Parse sync status from URL params
  useEffect(() => {
    const syncStatus = searchParams.get("sync");
    const message = searchParams.get("message");

    if (syncStatus === "success") {
      setNotification({
        type: "success",
        message: "GitHub profile and metrics synced successfully!",
      });
      // Clear URL params
      router.replace("/dashboard/github");
    } else if (syncStatus === "error") {
      setNotification({
        type: "error",
        message: message || "Failed to sync GitHub account. Please try again.",
      });
      router.replace("/dashboard/github");
    }
  }, [searchParams, router]);

  if (!studentProfile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-text-primary">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="font-mono text-sm text-text-secondary">Loading profile session...</span>
        </div>
      </div>
    );
  }

  const [repoSearchQuery, setRepoSearchQuery] = useState("");

  const handleConnect = () => {
    // Redirect to the backend OAuth redirect route with the current student's uid
    window.location.href = `/api/auth/github?uid=${studentProfile.uid}`;
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        "Are you sure you want to disconnect your GitHub account? This will remove synced repository stats from your profile."
      )
    )
      return;
    try {
      const docRef = doc(db, "students", studentProfile.uid);
      await updateDoc(docRef, {
        githubConnected: false,
        githubUrl: "",
        githubAccessTokenEncrypted: "",
        githubData: null,
        updatedAt: new Date().toISOString(),
      });
      setNotification({
        type: "success",
        message: "GitHub account disconnected successfully.",
      });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: "error",
        message: err.message || "Failed to disconnect account.",
      });
    }
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto w-full space-y-8 text-text-primary">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">GitHub Integration</h1>
          <p className="text-sm text-text-secondary mt-1 leading-relaxed max-w-xl">
            Analyze your software development metrics, calculate your global talent ranking, and showcase live analytics directly on your recruiter card.
          </p>
        </div>

        {studentProfile.githubConnected && (
          <div className="flex flex-wrap gap-3">
            <a
              href={`https://github.com/${studentProfile.githubData?.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-button bg-bg-surface border border-border px-4 py-2 hover:border-primary transition-all duration-200 text-sm font-semibold text-text-primary"
            >
              <Github className="h-4 w-4" /> connected: github.com/{studentProfile.githubData?.username} <ExternalLink className="h-3.5 w-3.5 text-text-disabled" />
            </a>

            <button
              onClick={handleConnect}
              className="inline-flex items-center gap-2 rounded-button bg-bg-surface border border-border px-4 py-2 hover:border-primary transition-all duration-200 text-sm font-semibold"
            >
              <RefreshCw className="h-4 w-4" /> Sync / Reconnect
            </button>

            <button
              onClick={handleDisconnect}
              className="inline-flex items-center gap-2 rounded-button bg-accent-warm/10 border border-accent-warm/30 hover:bg-accent-warm/20 text-accent-warm px-4 py-2 transition-all duration-200 text-sm font-semibold"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border flex items-start gap-3 ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="text-sm font-semibold block">
              {notification.type === "success" ? "Success" : "Connection Error"}
            </span>
            <span className="text-xs mt-0.5 block opacity-90">{notification.message}</span>
          </div>
        </motion.div>
      )}

      {/* Conditional Rendering based on connection status */}
      {!studentProfile.githubConnected || !studentProfile.githubData ? (
        /* Not Connected Landing Page */
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Main callout */}
          <div className="lg:col-span-7 rounded-card border border-border bg-bg-surface p-8 flex flex-col justify-between space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Github className="h-48 w-48 text-primary" />
            </div>

            <div className="space-y-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Github className="h-6 w-6" />
              </div>
              <h2 className="font-display text-2xl font-bold">Link your GitHub Profile</h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                Connect your account to sync your open-source projects, language breakdown, contribution streak, and commit metrics. Our backend will score your developer profile based on repository activity, code quality, deployment habits, and code consistency.
              </p>
            </div>

            <div className="pt-6">
              <button
                onClick={handleConnect}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-button bg-primary hover:bg-primary-dark text-white px-6 py-3 font-bold shadow-[0_4px_20px_rgba(108,99,255,0.25)] transition-all duration-200"
              >
                <Github className="h-5 w-5" /> Authorize GitHub Access
              </button>
              <span className="text-[10px] text-text-disabled mt-3 block">
                Required permissions: read:user, repo, read:org (to analyze public/private contributions).
              </span>
            </div>
          </div>

          {/* Feature list */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-card border border-border bg-bg-surface p-6 flex gap-4">
              <div className="h-10 w-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold">Calculate Global Talent Score</h4>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  Earn points for stars, project consistency, language diversity, and active deployments. Complete scores stand out to verified recruiters.
                </p>
              </div>
            </div>

            <div className="rounded-card border border-border bg-bg-surface p-6 flex gap-4">
              <div className="h-10 w-10 rounded-lg bg-accent-warm/10 text-accent-warm flex items-center justify-center shrink-0">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold">Interactive Recruiter Visuals</h4>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  Display an animated contribution grid, custom language charts, and repository lists directly on your public profile.
                </p>
              </div>
            </div>

            <div className="rounded-card border border-border bg-bg-surface p-6 flex gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold">Automated Refresh Sync</h4>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  Keep your portfolio up to date without manual editing. A daily background cron automatically updates your repository statistics.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Connected Dashboard Page */
        <div className="space-y-8">
          {/* Main Visual Stats Component */}
          <GitHubStats stats={studentProfile.githubData} />

          {/* Repository Cards Grid */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="font-display text-lg font-bold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-text-primary" /> Synchronized Repositories
              </h3>

              {/* Repo search bar */}
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-disabled" />
                <input
                  type="text"
                  placeholder="Search repository..."
                  value={repoSearchQuery}
                  onChange={(e) => setRepoSearchQuery(e.target.value)}
                  className="w-full rounded-input border border-border bg-bg-surface pl-10 pr-4 py-2.5 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                />
              </div>
            </div>

            {(() => {
              const filteredRepos = (studentProfile.githubData.repos || []).filter((repo) =>
                repo.name.toLowerCase().includes(repoSearchQuery.toLowerCase()) ||
                (repo.description || "").toLowerCase().includes(repoSearchQuery.toLowerCase())
              );

              if (filteredRepos.length === 0) {
                return (
                  <div className="rounded-card border border-dashed border-border bg-bg-surface p-12 text-center text-xs text-text-disabled">
                    No repositories match your search query.
                  </div>
                );
              }

              return (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredRepos.map((repo) => (
                    <div
                      key={repo.name}
                      className="rounded-card border border-border bg-bg-surface p-5 flex flex-col justify-between hover:border-primary/40 transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-sm font-bold tracking-tight truncate max-w-[80%]">
                            {repo.name}
                          </h4>
                          <a
                            href={`https://github.com/${studentProfile.githubData?.username}/${repo.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-text-disabled hover:text-primary transition-colors shrink-0"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed line-clamp-2 min-h-[2.5rem]">
                          {repo.description || "No description provided."}
                        </p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between text-xs text-text-secondary">
                        <div className="flex items-center gap-3">
                          {repo.language && (
                            <span className="font-mono px-2 py-0.5 rounded bg-bg-base border border-border/80">
                              {repo.language}
                            </span>
                          )}
                          <span className="flex items-center gap-0.5 font-mono">
                            <Star className="h-3.5 w-3.5 text-accent" /> {repo.stars}
                          </span>
                          <span className="flex items-center gap-0.5 font-mono">
                            <GitBranch className="h-3.5 w-3.5" /> {repo.forks}
                          </span>
                        </div>

                        {repo.homepage && (
                          <a
                            href={repo.homepage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5"
                          >
                            Live <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Scoring Formula Details */}
          <div className="rounded-card border border-border bg-bg-surface p-6 space-y-4">
            <h3 className="font-display text-base font-bold flex items-center gap-2 text-text-primary">
              <Award className="h-5 w-5 text-primary" /> How is your GitHub Talent Score calculated?
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Your overall Developer Profile Score is rated out of 100 points based on the following weighted algorithm:
            </p>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 pt-2 text-xs">
              <div className="p-3 border border-border/40 rounded-lg bg-bg-base/30">
                <span className="font-bold block text-text-primary">Repositories Score (Max 20)</span>
                <span className="text-text-secondary mt-1 block">2 points per public owned repository.</span>
              </div>
              <div className="p-3 border border-border/40 rounded-lg bg-bg-base/30">
                <span className="font-bold block text-text-primary">Stars Score (Max 20)</span>
                <span className="text-text-secondary mt-1 block">0.5 points per star earned across repositories.</span>
              </div>
              <div className="p-3 border border-border/40 rounded-lg bg-bg-base/30">
                <span className="font-bold block text-text-primary">Language Diversity (Max 15)</span>
                <span className="text-text-secondary mt-1 block">5 points per distinct language tag used (Max 3).</span>
              </div>
              <div className="p-3 border border-border/40 rounded-lg bg-bg-base/30">
                <span className="font-bold block text-text-primary">Commit Consistency (Max 15)</span>
                <span className="text-text-secondary mt-1 block">Penalized for consecutive inactivity gaps of 14-90 days.</span>
              </div>
              <div className="p-3 border border-border/40 rounded-lg bg-bg-base/30">
                <span className="font-bold block text-text-primary">Deployed Projects (Max 15)</span>
                <span className="text-text-secondary mt-1 block">3 points for each repository with a linked deploy URL.</span>
              </div>
              <div className="p-3 border border-border/40 rounded-lg bg-bg-base/30">
                <span className="font-bold block text-text-primary">Contributions Count (Max 15)</span>
                <span className="text-text-secondary mt-1 block">1 point per 100 commits, PRs, or issues in the last year.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
