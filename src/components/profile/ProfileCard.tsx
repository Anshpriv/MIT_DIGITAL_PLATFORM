"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GitFork, Star, FolderGit2, ArrowRight, Bookmark } from "lucide-react";
import type { Student } from "@/types";

interface Props {
  student: Student;
  onBookmark?: () => void;
  isBookmarked?: boolean;
}

export default function ProfileCard({ student, onBookmark, isBookmarked }: Props) {
  const topSkills = student.skills?.slice(0, 5) || [];
  const score = student.portfolioScore ?? 0;

  return (
    <motion.div
      whileHover={{ y: -4, shadow: "0px 12px 30px rgba(108, 99, 255, 0.15)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="rounded-card border border-border bg-bg-surface p-6 flex flex-col justify-between hover:border-primary/40 transition-colors relative overflow-hidden group shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
    >
      {/* Glow Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div>
        {/* Header Info */}
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
              {student.avatar ? (
                <img src={student.avatar} alt={student.name} className="h-full w-full object-cover" />
              ) : (
                student.name?.charAt(0) || "S"
              )}
            </div>
            <div>
              <h4 className="font-display font-bold text-text-primary text-base group-hover:text-primary transition-colors line-clamp-1">
                {student.name}
              </h4>
              <p className="text-xs text-text-secondary mt-0.5">
                {student.branch} &middot; Class of {student.graduationYear}
              </p>
            </div>
          </div>

          {/* Portfolio Score Donut & Bookmark Button */}
          <div className="flex items-center gap-2 shrink-0">
            {onBookmark && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onBookmark();
                }}
                className={`p-1.5 rounded-lg border transition-all duration-200 ${
                  isBookmarked
                    ? "bg-accent/15 border-accent/30 text-accent shadow-[0_0_12px_rgba(0,212,170,0.15)]"
                    : "bg-bg-elevated border-border text-text-secondary hover:text-text-primary hover:border-accent/40"
                }`}
              >
                <Bookmark className="h-4 w-4" fill={isBookmarked ? "currentColor" : "none"} />
              </button>
            )}

            <div className="relative flex items-center justify-center">
              <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-bg-elevated"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-primary"
                  strokeWidth="3.5"
                  strokeDasharray={`${score}, 100`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-[10px] font-extrabold text-text-primary">{score || "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {student.bio && (
          <p className="text-xs text-text-secondary line-clamp-2 mt-4 leading-relaxed">
            {student.bio.replace(/<[^>]*>/g, "")}
          </p>
        )}

        {/* Top Skills Badges */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {topSkills.map((skill) => (
            <span
              key={skill}
              className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-bg-base border border-border text-text-secondary"
            >
              {skill}
            </span>
          ))}
          {student.skills?.length > 5 && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-base border border-border text-text-disabled">
              +{student.skills.length - 5} more
            </span>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 pt-4 border-t border-border flex items-center justify-between gap-4">
        {/* GitHub Mini Stats */}
        <div className="flex items-center gap-3">
          {student.githubConnected && student.githubData ? (
            <>
              <div className="flex items-center gap-1 text-[10px] text-text-secondary font-mono">
                <FolderGit2 className="h-3 w-3 text-text-disabled" />
                <span>{student.githubData.repoCount}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-text-secondary font-mono">
                <Star className="h-3 w-3 text-accent" />
                <span>{student.githubData.totalStars}</span>
              </div>
            </>
          ) : (
            <span className="text-[10px] text-text-disabled font-mono">No GitHub linked</span>
          )}
        </div>

        {/* View Profile Button */}
        <Link
          href={`/profile/${student.uid}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
        >
          View Profile <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </motion.div>
  );
}
