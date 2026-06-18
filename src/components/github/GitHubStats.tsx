"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GitBranch, Star, Users, FolderGit2, Info } from "lucide-react";
import type { GitHubStats as GitHubStatsType } from "@/types";

interface GitHubStatsProps {
  stats: GitHubStatsType & {
    contributionCalendar?: { date: string; contributionCount: number; color: string }[];
  };
}

function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = Math.floor(value);
    if (end <= 0) {
      setCount(0);
      return;
    }

    const incrementTime = Math.max(Math.floor(duration / end), 15);
    const step = Math.max(Math.ceil(end / (duration / incrementTime)), 1);

    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{count.toLocaleString()}</>;
}

export default function GitHubStats({ stats }: GitHubStatsProps) {
  const {
    repoCount,
    totalStars,
    totalForks,
    followers,
    topLanguages = [],
    commitsLastYear,
    contributionStreak,
    overallGitHubScore,
    lastSyncedAt,
    contributionCalendar = [],
  } = stats;

  // 1. Group contribution days into weeks of 7 days
  const weeks: typeof contributionCalendar[] = [];
  let tempWeek: typeof contributionCalendar = [];

  // Align days by day of the week to get proper Sunday-Saturday rows.
  // We can just chunk the array into rows of 7.
  for (let i = 0; i < contributionCalendar.length; i++) {
    tempWeek.push(contributionCalendar[i]);
    if (tempWeek.length === 7 || i === contributionCalendar.length - 1) {
      weeks.push(tempWeek);
      tempWeek = [];
    }
  }

  // Limit calendar view to the last 24 weeks for a clean layout on smaller dashboards
  const activeWeeks = weeks.slice(-24);

  // Helper to color code based on contribution count
  const getContributionColor = (count: number) => {
    if (count === 0) return "bg-bg-elevated/40 border border-border/10";
    if (count <= 2) return "bg-primary/25 border border-primary/30";
    if (count <= 5) return "bg-primary/50 border border-primary/50";
    if (count <= 9) return "bg-primary/75 border border-primary/80";
    return "bg-primary border border-primary";
  };

  // 2. Prepare SVG Donut slices
  const R = 38;
  const C = 2 * Math.PI * R; // ~238.76
  let accumulatedPercentage = 0;

  const colorPalettes = ["#6366f1", "#a855f7", "#ec4899", "#10b981", "#f59e0b"];

  const slices = topLanguages.slice(0, 5).map((lang, idx) => {
    const percent = lang.percent;
    const strokeLength = (percent / 100) * C;
    const strokeOffset = C - (accumulatedPercentage / 100) * C;
    accumulatedPercentage += percent;
    return {
      ...lang,
      color: colorPalettes[idx % colorPalettes.length],
      strokeLength,
      strokeOffset,
    };
  });

  return (
    <div className="space-y-8 bg-bg-surface border border-border rounded-card p-6 md:p-8 text-text-primary">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h3 className="font-display text-xl font-bold flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
            GitHub Analytics Dashboard
          </h3>
          <p className="text-xs text-text-secondary mt-1 font-mono">
            Last updated: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "Never"}
          </p>
        </div>

        {/* Global Score Widget */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30 px-5 py-3.5 flex items-center gap-4">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-text-secondary block">
              Global Talent Score
            </span>
            <span className="text-2xl font-extrabold text-primary block mt-0.5">
              <AnimatedCounter value={overallGitHubScore} />
              <span className="text-sm font-normal text-text-secondary"> /100</span>
            </span>
          </div>
          <div className="h-10 w-10 rounded-full border border-primary/20 flex items-center justify-center bg-primary/5">
            <Info className="h-4.5 w-4.5 text-primary" />
          </div>
        </div>
      </div>

      {/* Grid of Key Numerical Analytics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Repo Count */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-bg-base border border-border/60 p-5 rounded-lg flex items-center gap-4 transition-colors hover:border-primary/40"
        >
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <FolderGit2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-text-secondary font-mono block">Public Repositories</span>
            <span className="text-2xl font-bold block mt-0.5">
              <AnimatedCounter value={repoCount} />
            </span>
          </div>
        </motion.div>

        {/* Total Stars */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-bg-base border border-border/60 p-5 rounded-lg flex items-center gap-4 transition-colors hover:border-accent/40"
        >
          <div className="h-10 w-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
            <Star className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-text-secondary font-mono block">Total Stars</span>
            <span className="text-2xl font-bold block mt-0.5 text-accent">
              <AnimatedCounter value={totalStars} />
            </span>
          </div>
        </motion.div>

        {/* Total Forks */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-bg-base border border-border/60 p-5 rounded-lg flex items-center gap-4 transition-colors hover:border-accent-warm/40"
        >
          <div className="h-10 w-10 rounded-lg bg-accent-warm/10 text-accent-warm flex items-center justify-center">
            <GitBranch className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-text-secondary font-mono block">Total Forks</span>
            <span className="text-2xl font-bold block mt-0.5 text-accent-warm">
              <AnimatedCounter value={totalForks} />
            </span>
          </div>
        </motion.div>

        {/* Followers */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-bg-base border border-border/60 p-5 rounded-lg flex items-center gap-4 transition-colors hover:border-primary/40"
        >
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-text-secondary font-mono block">Followers</span>
            <span className="text-2xl font-bold block mt-0.5">
              <AnimatedCounter value={followers} />
            </span>
          </div>
        </motion.div>
      </div>

      {/* Donut Chart and Language Stats Row */}
      <div className="grid gap-6 md:grid-cols-12 items-center">
        {/* SVG Donut Chart */}
        <div className="md:col-span-5 flex flex-col items-center justify-center border border-border/50 rounded-lg bg-bg-base/30 p-6">
          <span className="text-sm font-semibold mb-4 font-mono block text-center text-text-secondary">
            Language Breakdown
          </span>
          <div className="relative flex items-center justify-center h-44 w-44">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              <circle
                cx="50"
                cy="50"
                r={R}
                fill="transparent"
                stroke="#1f2937"
                strokeWidth="10"
                className="opacity-20"
              />
              {slices.map((slice) => (
                <motion.circle
                  key={slice.name}
                  cx="50"
                  cy="50"
                  r={R}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth="10"
                  strokeDasharray={`${slice.strokeLength} ${C}`}
                  strokeDashoffset={slice.strokeOffset}
                  initial={{ strokeDashoffset: C }}
                  animate={{ strokeDashoffset: slice.strokeOffset }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              ))}
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold">{topLanguages.length}</span>
              <span className="text-[10px] text-text-secondary uppercase tracking-widest font-mono">
                Languages
              </span>
            </div>
          </div>
        </div>

        {/* Legend / Metrics List */}
        <div className="md:col-span-7 space-y-4">
          <div className="grid gap-3">
            {slices.length > 0 ? (
              slices.map((slice) => (
                <div key={slice.name} className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                    <span className="text-sm font-semibold font-display">{slice.name}</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-text-secondary">
                    {slice.percent.toFixed(1)}%
                  </span>
                </div>
              ))
            ) : (
              <span className="text-sm text-text-disabled block text-center">No language details found.</span>
            )}
          </div>
        </div>
      </div>

      {/* Contribution Calendar */}
      {contributionCalendar.length > 0 && (
        <div className="border border-border/50 rounded-lg bg-bg-base/30 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-sm font-semibold font-mono block text-text-secondary">
                Contribution Calendar
              </span>
              <p className="text-xs text-text-disabled mt-0.5">
                Activity calendar tracked over the last year
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-text-secondary font-mono">Streak:</span>
                <span className="font-bold text-accent font-mono">{contributionStreak} days</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-text-secondary font-mono">Total Contributions:</span>
                <span className="font-bold text-primary font-mono">{commitsLastYear}</span>
              </div>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <div className="flex gap-[3px] min-w-[500px]">
              {activeWeeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-[3px]">
                  {week.map((day, dayIdx) => (
                    <div
                      key={day.date || dayIdx}
                      className={`h-2.5 w-2.5 rounded-sm transition-all duration-300 hover:scale-125 ${getContributionColor(
                        day.contributionCount
                      )}`}
                      title={`${day.contributionCount} contributions on ${new Date(
                        day.date
                      ).toLocaleDateString()}`}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-3 text-[10px] text-text-disabled font-mono max-w-[200px]">
              <span>Less</span>
              <div className="flex gap-[3px] items-center mx-2">
                <div className="h-2.5 w-2.5 rounded-sm bg-bg-elevated/40" />
                <div className="h-2.5 w-2.5 rounded-sm bg-primary/25" />
                <div className="h-2.5 w-2.5 rounded-sm bg-primary/50" />
                <div className="h-2.5 w-2.5 rounded-sm bg-primary/75" />
                <div className="h-2.5 w-2.5 rounded-sm bg-primary" />
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
