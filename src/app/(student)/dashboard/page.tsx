"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import {
  Eye,
  Bookmark,
  Sparkles,
  Github,
  ChevronRight,
  TrendingUp,
  Award,
  Plus,
  GitBranch,
} from "lucide-react";
import Link from "next/link";

interface Activity {
  id: string;
  type: string;
  title: string;
  time: string;
  icon: any;
  color: string;
}

export default function StudentDashboard() {
  const { studentProfile } = useAuth();
  const [profileViews, setProfileViews] = useState(0);

  useEffect(() => {
    if (!studentProfile?.uid) return;
    const loadViews = async () => {
      try {
        const snap = await getDocs(
          collection(db, "students", studentProfile.uid, "profileViews")
        );
        setProfileViews(snap.size);
      } catch (err) {
        console.error("Failed to load profile views", err);
      }
    };
    loadViews();
  }, [studentProfile?.uid]);

  // Calculate Profile Completion Percentage
  const calculateCompletion = () => {
    if (!studentProfile) return 0;
    let score = 0;
    if (studentProfile.avatar) score += 10;
    if (studentProfile.bio) score += 10;
    if (studentProfile.skills && studentProfile.skills.length > 0) score += 20;
    if (studentProfile.techStack && studentProfile.techStack.length > 0) score += 10;
    if (studentProfile.githubConnected || studentProfile.githubUrl) score += 15;
    if (studentProfile.linkedinUrl) score += 10;
    if (studentProfile.resumeUrl) score += 15;
    if (studentProfile.projects && studentProfile.projects.length > 0) score += 10;
    return score;
  };

  const completionPercent = calculateCompletion();

  // Mock activity feed based on filled profile info to make page look premium and "alive"
  const getActivityFeed = (): Activity[] => {
    const list: Activity[] = [];
    if (studentProfile) {
      if (studentProfile.createdAt) {
        list.push({
          id: "welcome",
          type: "milestone",
          title: "Joined MIT-WPU Talent Hub",
          time: "Account initialized",
          icon: Sparkles,
          color: "text-accent bg-accent/10",
        });
      }
      if (studentProfile.skills && studentProfile.skills.length > 0) {
        list.push({
          id: "skills",
          type: "update",
          title: `Added ${studentProfile.skills.length} core skills`,
          time: "Skills profile synchronized",
          icon: TrendingUp,
          color: "text-primary bg-primary/10",
        });
      }
      if (studentProfile.projects && studentProfile.projects.length > 0) {
        list.push({
          id: "project",
          type: "work",
          title: `Featured project: ${studentProfile.projects[0].name}`,
          time: "Portfolio updated",
          icon: FolderCodeIcon,
          color: "text-accent bg-accent/10",
        });
      }
      if (studentProfile.githubConnected) {
        list.push({
          id: "github",
          type: "github",
          title: "GitHub Repository metrics linked",
          time: "Synced successfully",
          icon: Github,
          color: "text-text-primary bg-bg-elevated",
        });
      }
      if (studentProfile.achievements && studentProfile.achievements.length > 0) {
        list.push({
          id: "achievement",
          type: "win",
          title: studentProfile.achievements[0].title,
          time: "Timeline update",
          icon: Award,
          color: "text-accent-warm bg-accent-warm/10",
        });
      }
    }

    if (list.length === 0) {
      list.push({
        id: "empty",
        type: "tip",
        title: "Complete your basic info to generate activity logs.",
        time: "Profile is currently empty",
        icon: Sparkles,
        color: "text-accent-warm bg-accent-warm/10",
      });
    }

    return list;
  };

  const activityFeed = getActivityFeed();

  return (
    <div className="flex flex-col gap-8 p-8 max-w-[1200px] mx-auto w-full">
      {/* Title */}
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Welcome back, {studentProfile?.name?.split(" ")[0]}
        </h1>
        <p className="text-sm text-text-secondary mt-1 font-mono">
          MIT-WPU ID: {studentProfile?.studentId || "Not Configured"}
        </p>
      </div>

      {/* Completion Progress Card */}
      <div className="rounded-card border border-border bg-bg-surface p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Sparkles className="h-32 w-32 text-primary" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-lg">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              Complete your profile
              {completionPercent === 100 && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-accent/20 text-accent uppercase">
                  Verified 100%
                </span>
              )}
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              Completing your profile increases your chance of getting discovered by recruiters looking for specialized talent at MIT-WPU.
            </p>
          </div>
          <div className="flex items-center gap-4 min-w-[200px]">
            <span className="font-mono text-3xl font-extrabold text-primary">{completionPercent}%</span>
            <div className="flex-1 bg-bg-base h-2.5 rounded-full overflow-hidden border border-border">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </div>

        {completionPercent < 100 && (
          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-xs text-text-secondary">
              Next step: {studentProfile?.resumeUrl ? "Add a featured project" : "Upload your resume PDF"}
            </span>
            <Link
              href="/profile"
              className="text-xs font-bold text-primary hover:text-primary-dark inline-flex items-center gap-1 transition-colors"
            >
              Update Profile <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Profile Views */}
        <div className="rounded-card border border-border bg-bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Profile Views</span>
            <Eye className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-display font-bold">{profileViews}</span>
            <span className="text-[10px] text-accent font-mono">Real-time</span>
          </div>
        </div>

        {/* Recruiter Saves */}
        <div className="rounded-card border border-border bg-bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Recruiter Saves</span>
            <Bookmark className="h-5 w-5 text-accent" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-display font-bold">12</span>
            <span className="text-[10px] text-text-disabled font-mono">Mocked</span>
          </div>
        </div>

        {/* Portfolio Score */}
        <div className="rounded-card border border-border bg-bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">AI Portfolio Score</span>
            <GitBranch className="h-5 w-5 text-accent-warm" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-display font-bold">
              {studentProfile?.portfolioScore !== null && studentProfile?.portfolioScore !== undefined
                ? studentProfile.portfolioScore
                : "—"}
            </span>
            <span className="text-[10px] text-text-secondary font-mono">/100</span>
          </div>
        </div>

        {/* GitHub Stars */}
        <div className="rounded-card border border-border bg-bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">GitHub Stars</span>
            <Github className="h-5 w-5 text-text-primary" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-display font-bold">
              {studentProfile?.githubData?.totalStars ?? "—"}
            </span>
            <span className="text-[10px] text-text-secondary font-mono">Synced</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Activity & Call to Actions */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Activity Feed */}
        <div className="md:col-span-2 rounded-card border border-border bg-bg-surface p-6 space-y-6">
          <h3 className="font-display text-lg font-bold">Recent activity</h3>
          <div className="relative border-l border-border pl-6 ml-2 space-y-6">
            {activityFeed.map((item) => (
              <div key={item.id} className="relative">
                {/* Connector dot */}
                <div
                  className={`absolute left-[-31px] top-1.5 h-4 w-4 rounded-full flex items-center justify-center border-4 border-bg-surface ${
                    item.id === "github" ? "bg-text-primary" : "bg-primary"
                  }`}
                />
                <div className="space-y-1">
                  <span className="text-sm font-semibold text-text-primary block">{item.title}</span>
                  <span className="text-xs text-text-secondary block font-mono">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions panel */}
        <div className="rounded-card border border-border bg-bg-surface p-6 flex flex-col gap-4">
          <h3 className="font-display text-lg font-bold">Quick links</h3>
          <Link
            href="/profile"
            className="flex items-center justify-between p-3.5 rounded-lg border border-border hover:border-primary bg-bg-base transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                <Plus className="h-4 w-4" />
              </div>
              <div className="text-left">
                <span className="text-sm font-bold block">Add Project</span>
                <span className="text-xs text-text-secondary">Showcase new work</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-text-disabled group-hover:text-primary transition-colors" />
          </Link>

          <Link
            href="/profile?tab=skills"
            className="flex items-center justify-between p-3.5 rounded-lg border border-border hover:border-accent bg-bg-base transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-accent/10 flex items-center justify-center text-accent">
                <Plus className="h-4 w-4" />
              </div>
              <div className="text-left">
                <span className="text-sm font-bold block">Update Skills</span>
                <span className="text-xs text-text-secondary">Add core stack tags</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-text-disabled group-hover:text-accent transition-colors" />
          </Link>

          <div className="rounded-lg border border-border bg-bg-base p-4 mt-auto">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2 font-mono">
              Recruiter Preview
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed mb-4">
              See what recruiters will see when they browse or click your card.
            </p>
            {studentProfile && (
              <Link
                href={`/profile/${studentProfile.uid}`}
                className="w-full text-center block text-xs font-semibold py-2 px-3 border border-border hover:border-primary bg-bg-surface rounded-button transition-colors"
              >
                View Public Profile
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple folder icon replacement helper
function FolderCodeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
      />
    </svg>
  );
}
