"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Link2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
  Loader2,
  ChevronRight,
  TrendingUp,
  FolderKanban,
  FileText,
  Linkedin,
  Github,
  Award,
  BookOpen,
  Layout,
  Clock,
  Compass,
} from "lucide-react";

export default function PortfolioScorePage() {
  const { user, studentProfile, refresh } = useAuth();
  const [analyzing, setAnalyzing] = useState(false);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  // Initialize URL field if profile has it
  useEffect(() => {
    if (studentProfile?.portfolioUrl) {
      setPortfolioUrl(studentProfile.portfolioUrl);
    }
  }, [studentProfile]);

  // Handle Rate Limiting Timer
  useEffect(() => {
    if (!studentProfile?.lastAnalyzedAt) return;

    const interval = setInterval(() => {
      const last = new Date(studentProfile.lastAnalyzedAt!).getTime();
      const diffMs = Date.now() - last;
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (diffMs < twentyFourHours) {
        const remainingMs = twentyFourHours - diffMs;
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(null);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [studentProfile?.lastAnalyzedAt]);

  const handleAnalyze = async () => {
    if (!portfolioUrl || !portfolioUrl.startsWith("http")) {
      setError("Please enter a valid portfolio URL (including http:// or https://)");
      return;
    }

    setAnalyzing(true);
    setError(null);
    setSuccess(null);

    try {
      // Fetch fresh session token if available, otherwise call route directly
      let headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      const res = await fetch("/api/portfolio/analyze", {
        method: "POST",
        headers,
        body: JSON.stringify({
          portfolioUrl,
          studentUid: user?.uid,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze portfolio. Please try again.");
      }

      setSuccess("Portfolio analyzed successfully!");
      await refresh();
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred during analysis.");
    } finally {
      setAnalyzing(false);
    }
  };

  const analysis = studentProfile?.portfolioAnalysis;
  const health = studentProfile?.portfolioHealthScore;

  // Animation values for circular gauge
  const overallScore = analysis?.overallScore || 0;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full text-text-primary">
      {/* Top Banner Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <Sparkles className="h-9 w-9 text-primary animate-pulse" />
            AI Portfolio Analyzer
          </h1>
          <p className="text-sm text-text-secondary mt-2 max-w-xl">
            Evaluate your portfolio against recruiter expectations. Optimize your score to stand out to hiring managers.
          </p>
        </div>

        {/* Input & Action Trigger */}
        <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 sm:w-80">
            <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-disabled" />
            <input
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://yourportfolio.com"
              disabled={analyzing}
              className="w-full rounded-input border border-border bg-bg-surface pl-10 pr-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={analyzing || !!timeRemaining}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary-dark hover:brightness-110 active:scale-[0.98] text-white font-semibold px-5 py-2.5 rounded-button text-xs transition-all duration-200 shadow-[0_4px_16px_rgba(108,99,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
              </>
            ) : timeRemaining ? (
              <>
                <Clock className="h-4 w-4" /> Locked ({timeRemaining})
              </>
            ) : (
              "Analyze Portfolio"
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-3 bg-accent-warm/10 border border-accent-warm/30 text-accent-warm p-4 rounded-card text-xs font-mono"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-3 bg-accent/10 border border-accent/30 text-accent p-4 rounded-card text-xs font-mono"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {!analysis ? (
        /* Empty/Initial State */
        <div className="rounded-card border border-dashed border-border bg-bg-surface p-16 text-center space-y-6">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Compass className="h-8 w-8 text-primary animate-spin-slow" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="font-display font-bold text-lg text-text-primary">No Analysis Found</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Enter your live portfolio URL above to start the recruiter-mode evaluation. Gemini will scan design, code quality, readability, and content metrics.
            </p>
          </div>
        </div>
      ) : (
        /* Analysis Results Page */
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Column 1: Scores Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Overall Score Circle */}
            <div className="rounded-card border border-border bg-bg-surface p-6 shadow-lg flex flex-col items-center justify-center text-center space-y-4">
              <span className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-widest">
                Overall Recruiter Score
              </span>

              <div className="relative flex items-center justify-center h-48 w-48">
                {/* Background Ring */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r={radius}
                    className="stroke-border"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  {/* Glowing Score Arc */}
                  <motion.circle
                    cx="96"
                    cy="96"
                    r={radius}
                    className="stroke-primary"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-4xl font-extrabold tracking-tight">
                    {overallScore}
                  </span>
                  <span className="text-[10px] font-mono text-text-disabled mt-1 uppercase tracking-wider">
                    out of 100
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-accent font-semibold font-mono bg-accent/5 border border-accent/20 px-2.5 py-1 rounded-full">
                <TrendingUp className="h-3.5 w-3.5" /> High Recruitment Intent
              </div>
            </div>

            {/* Health Score Panel */}
            <div className="rounded-card border border-border bg-bg-surface p-6 shadow-lg space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-widest">
                  Portfolio Health Score
                </span>
                <span className="font-mono text-sm font-bold text-accent">
                  {health?.healthScore || 0}/100
                </span>
              </div>

              {/* Simple health meter */}
              <div className="h-2 w-full bg-bg-base rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-accent transition-all duration-500"
                  style={{ width: `${health?.healthScore || 0}%` }}
                />
              </div>

              {/* Health Score checklist */}
              <div className="space-y-2 pt-2 text-xs font-mono">
                <div className="flex justify-between border-b border-border/50 pb-1.5">
                  <span className="text-text-secondary">Project Complexity</span>
                  <span>{health?.breakdown?.projectComplexity || 0}/15</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-1.5">
                  <span className="text-text-secondary">Deployment Status</span>
                  <span>{health?.breakdown?.deploymentAvailability || 0}/10</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-1.5">
                  <span className="text-text-secondary">GitHub Sync</span>
                  <span>{health?.breakdown?.githubIntegration || 0}/10</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-1.5">
                  <span className="text-text-secondary">Content & Typography</span>
                  <span>{health?.breakdown?.contentQuality || 0}/15</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-1.5">
                  <span className="text-text-secondary">Achievements & Certs</span>
                  <span>{health?.breakdown?.achievementsAdded || 0}/10</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-1.5">
                  <span className="text-text-secondary">Language Diversity</span>
                  <span>{health?.breakdown?.technicalDiversity || 0}/10</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-1.5">
                  <span className="text-text-secondary">Profile Completeness</span>
                  <span>{health?.breakdown?.profileCompleteness || 0}/15</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-1.5">
                  <span className="text-text-secondary">Impact Metrics</span>
                  <span>{health?.breakdown?.impactStatements || 0}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Documentation (Resume/LinkedIn)</span>
                  <span>
                    {((health?.breakdown?.hasResume || 0) + (health?.breakdown?.hasLinkedIn || 0))}/10
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Details & Sub-scores */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sub-category Score Bars */}
            <div className="rounded-card border border-border bg-bg-surface p-6 shadow-lg space-y-5">
              <h3 className="font-display font-bold text-base flex items-center gap-2">
                <Layout className="h-5 w-5 text-primary" /> Evaluation Categories
              </h3>

              <div className="space-y-4.5">
                {/* Technical Depth */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-text-primary">Technical Depth</span>
                    <span className="font-mono">{analysis?.technicalDepthScore}/20</span>
                  </div>
                  <div className="h-2 w-full bg-bg-base border border-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${((analysis?.technicalDepthScore || 0) / 20) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Recruiter Readability */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-text-primary">Recruiter Readability</span>
                    <span className="font-mono">{analysis?.recruiterReadabilityScore}/20</span>
                  </div>
                  <div className="h-2 w-full bg-bg-base border border-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-500"
                      style={{ width: `${((analysis?.recruiterReadabilityScore || 0) / 20) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Project Quality */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-text-primary">Project Quality & Demobuttons</span>
                    <span className="font-mono">{analysis?.projectQualityScore}/20</span>
                  </div>
                  <div className="h-2 w-full bg-bg-base border border-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-dark transition-all duration-500"
                      style={{ width: `${((analysis?.projectQualityScore || 0) / 20) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Design Quality */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-text-primary">Design & Visual Hierarchy</span>
                    <span className="font-mono">{analysis?.designScore}/20</span>
                  </div>
                  <div className="h-2 w-full bg-bg-base border border-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-500"
                      style={{ width: `${((analysis?.designScore || 0) / 20) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recruiter Verdict Card */}
            <div className="rounded-card border-l-4 border-l-indigo-500 border border-border bg-bg-surface p-6 shadow-md">
              <h4 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider mb-2">
                Hiring Manager Verdict
              </h4>
              <p className="text-sm italic text-text-primary leading-relaxed">
                &ldquo;{analysis?.recruiterVerdict}&rdquo;
              </p>
            </div>

            {/* Strengths & Improvements */}
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Strengths Card */}
              <div className="rounded-card border border-border bg-bg-surface p-5 space-y-4">
                <h4 className="font-display font-bold text-sm text-accent flex items-center gap-2">
                  <CheckCircle2 className="h-4.5 w-4.5" /> Strengths Detected
                </h4>
                <ul className="space-y-2.5 text-xs text-text-secondary leading-relaxed">
                  {analysis?.strengths?.map((str, idx) => (
                    <li key={idx} className="flex gap-2 items-start">
                      <span className="text-accent shrink-0 mt-0.5">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Improvements Card */}
              <div className="rounded-card border border-border bg-bg-surface p-5 space-y-4">
                <h4 className="font-display font-bold text-sm text-accent-warm flex items-center gap-2">
                  <TrendingUp className="h-4.5 w-4.5" /> Improvement Opportunities
                </h4>
                <ul className="space-y-2.5 text-xs text-text-secondary leading-relaxed">
                  {analysis?.improvements?.map((imp, idx) => (
                    <li key={idx} className="flex gap-2 items-start">
                      <span className="text-accent-warm shrink-0 mt-0.5">•</span>
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Badge Clouds & Metadata */}
            <div className="rounded-card border border-border bg-bg-surface p-6 shadow-lg space-y-5">
              <h3 className="font-display font-bold text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Detected Skills & Tech
              </h3>

              <div className="space-y-4">
                {/* Tech Stack Badge Cloud */}
                <div>
                  <h4 className="text-xs font-mono text-text-disabled uppercase tracking-wide mb-2">
                    Tech Stack Badges
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis?.detectedTechStack?.map((tech, idx) => (
                      <span
                        key={idx}
                        className="bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded text-xs font-mono"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Skills Cloud */}
                <div>
                  <h4 className="text-xs font-mono text-text-disabled uppercase tracking-wide mb-2">
                    Core Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis?.detectedSkills?.map((skill, idx) => (
                      <span
                        key={idx}
                        className="bg-bg-elevated border border-border text-text-secondary px-2.5 py-1 rounded text-xs"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Health Indicators (Boolean checklist icons) */}
            <div className="rounded-card border border-border bg-bg-surface p-6 shadow-lg space-y-4">
              <h3 className="font-display font-bold text-base">Metadata Checklist</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-2 bg-bg-base border border-border/60 p-3 rounded text-xs">
                  {analysis?.hasDeploymentLinks ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-accent shrink-0" />
                  ) : (
                    <XCircle className="h-4.5 w-4.5 text-accent-warm shrink-0" />
                  )}
                  <span className="font-semibold text-text-secondary truncate">Deployed Links</span>
                </div>

                <div className="flex items-center gap-2 bg-bg-base border border-border/60 p-3 rounded text-xs">
                  {analysis?.hasGitHubLinks ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-accent shrink-0" />
                  ) : (
                    <XCircle className="h-4.5 w-4.5 text-accent-warm shrink-0" />
                  )}
                  <span className="font-semibold text-text-secondary truncate">GitHub Links</span>
                </div>

                <div className="flex items-center gap-2 bg-bg-base border border-border/60 p-3 rounded text-xs">
                  {analysis?.hasContactInfo ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-accent shrink-0" />
                  ) : (
                    <XCircle className="h-4.5 w-4.5 text-accent-warm shrink-0" />
                  )}
                  <span className="font-semibold text-text-secondary truncate">Contact Info</span>
                </div>

                <div className="flex items-center gap-2 bg-bg-base border border-border/60 p-3 rounded text-xs">
                  {analysis?.isResponsive ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-accent shrink-0" />
                  ) : (
                    <XCircle className="h-4.5 w-4.5 text-accent-warm shrink-0" />
                  )}
                  <span className="font-semibold text-text-secondary truncate">Mobile Responsive</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
