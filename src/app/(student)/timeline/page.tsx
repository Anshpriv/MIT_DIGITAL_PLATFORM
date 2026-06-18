"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { generateTimeline } from "@/lib/timeline-generator";
import type { TimelineEvent } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Trophy,
  Award,
  ShieldCheck,
  Briefcase,
  Github,
  Compass,
  UserPlus,
  Loader2,
  Calendar,
  Filter,
  Plus,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export default function TimelinePage() {
  const { studentProfile, refresh } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<TimelineEvent[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch timeline events
  useEffect(() => {
    async function loadTimeline() {
      if (!studentProfile?.uid) return;
      setLoading(true);
      setError(null);
      try {
        const data = await generateTimeline(studentProfile.uid);
        setEvents(data);
        setFilteredEvents(data);
      } catch (err: any) {
        console.error("Failed to load timeline events:", err);
        setError("Failed to compile timeline milestones.");
      } finally {
        setLoading(false);
      }
    }
    loadTimeline();
  }, [studentProfile]);

  // Apply filters
  useEffect(() => {
    if (activeFilter === "all") {
      setFilteredEvents(events);
    } else if (activeFilter === "hackathons") {
      setFilteredEvents(events.filter((e) => e.type === "hackathon_win"));
    } else if (activeFilter === "achievements") {
      setFilteredEvents(events.filter((e) => e.type === "achievement"));
    } else if (activeFilter === "certifications") {
      setFilteredEvents(events.filter((e) => e.type === "certification"));
    } else if (activeFilter === "projects") {
      setFilteredEvents(events.filter((e) => e.type === "project"));
    } else if (activeFilter === "github") {
      setFilteredEvents(events.filter((e) => e.type === "github_repo"));
    }
  }, [activeFilter, events]);

  const handleGenerateNarrative = async () => {
    if (!studentProfile?.uid) return;
    setNarrativeLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/timeline/generate-narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentUid: studentProfile.uid }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate AI narrative.");
      }
      await refresh();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred generating AI narrative.");
    } finally {
      setNarrativeLoading(false);
    }
  };

  // Get icons mapping
  const getEventIcon = (type: string) => {
    switch (type) {
      case "hackathon_win":
        return Trophy;
      case "achievement":
        return Award;
      case "certification":
        return ShieldCheck;
      case "project":
        return Briefcase;
      case "github_repo":
        return Github;
      case "profile_milestone":
        return Compass;
      default:
        return Award;
    }
  };

  // Get color configuration
  const getEventColors = (type: string) => {
    switch (type) {
      case "hackathon_win":
        return {
          bg: "bg-accent-warm/10",
          border: "border-accent-warm/30",
          text: "text-accent-warm",
          dot: "bg-accent-warm",
        };
      case "certification":
        return {
          bg: "bg-accent/10",
          border: "border-accent/30",
          text: "text-accent",
          dot: "bg-accent",
        };
      case "github_repo":
        return {
          bg: "bg-bg-elevated",
          border: "border-border",
          text: "text-text-secondary",
          dot: "bg-text-secondary",
        };
      default:
        return {
          bg: "bg-primary/10",
          border: "border-primary/30",
          text: "text-primary",
          dot: "bg-primary",
        };
    }
  };

  // Format month and year from ISO or formatted dates
  const formatEventDate = (dateStr: string) => {
    const parsed = Date.parse(dateStr);
    if (isNaN(parsed)) {
      return dateStr; // Return raw date if already in a friendly string like "March 2026"
    }
    return new Date(parsed).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-5xl mx-auto w-full text-text-primary">
      {/* Top Heading */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <Compass className="h-9 w-9 text-primary animate-pulse" />
            Milestone Timeline
          </h1>
          <p className="text-sm text-text-secondary mt-2">
            Chronological progress, achievements, and repositories synced automatically from your profile.
          </p>
        </div>
      </div>

      {/* Narrative Card */}
      <div className="relative overflow-hidden rounded-card border border-transparent bg-gradient-to-r from-primary/15 to-accent/15 p-[1px] shadow-lg">
        <div className="bg-bg-surface rounded-[inherit] p-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-primary font-mono bg-primary/5 px-2.5 py-1 rounded-full border border-primary/20">
              <Sparkles className="h-3.5 w-3.5" /> Generated by Gemini AI
            </span>

            <button
              onClick={handleGenerateNarrative}
              disabled={narrativeLoading}
              className="flex items-center gap-1.5 hover:text-primary active:scale-95 text-xs font-semibold text-text-secondary transition-all"
            >
              {narrativeLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Regenerate Bio
            </button>
          </div>

          <div className="space-y-3.5 text-sm leading-relaxed text-text-secondary italic">
            {narrativeLoading ? (
              <div className="py-8 text-center text-xs text-text-disabled space-y-2">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                <p>Gemini is scanning your achievements and writing a professional narrative...</p>
              </div>
            ) : studentProfile?.aiNarrative ? (
              studentProfile.aiNarrative.split("\n\n").map((para, i) => (
                <p key={i} className="first-letter:text-lg first-letter:font-bold first-letter:text-primary">
                  {para}
                </p>
              ))
            ) : (
              <div className="py-4 text-center space-y-3">
                <p className="not-italic text-xs">No profile bio narrative generated yet.</p>
                <button
                  onClick={handleGenerateNarrative}
                  className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-button text-xs font-bold transition-all shadow"
                >
                  Generate AI Bio Narrative
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2 bg-accent-warm/10 border border-accent-warm/20 text-accent-warm p-4 rounded-card text-xs font-mono">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-2 items-center bg-bg-surface border border-border p-2 rounded-xl">
        <span className="text-xs font-mono text-text-disabled uppercase px-2 flex items-center gap-1">
          <Filter className="h-3 w-3" /> Filters:
        </span>
        {[
          { id: "all", label: "All Milestones" },
          { id: "projects", label: "Projects" },
          { id: "hackathons", label: "Hackathons" },
          { id: "achievements", label: "Achievements" },
          { id: "certifications", label: "Certificates" },
          { id: "github", label: "GitHub" },
        ].map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === filter.id
                ? "bg-primary text-white"
                : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Timeline Rendering */}
      {loading ? (
        <div className="py-16 text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-xs text-text-secondary">Loading milestones...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="border border-dashed border-border p-16 text-center rounded-card space-y-2 text-text-secondary">
          <p className="text-sm font-bold">No Milestones Found</p>
          <p className="text-xs">Adjust your active filter or complete fields on your profile edit page.</p>
        </div>
      ) : (
        <div className="relative pl-6 md:pl-0">
          {/* Vertical central/left line */}
          <div className="absolute left-[15px] md:left-1/2 md:-translate-x-1/2 top-2 bottom-2 w-[2px] bg-border" />

          {/* Timeline Cards */}
          <div className="space-y-12">
            {filteredEvents.map((event, idx) => {
              const IconComp = getEventIcon(event.type);
              const colors = getEventColors(event.type);
              const isEven = idx % 2 === 0;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 35 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`relative flex flex-col md:flex-row ${
                    isEven ? "md:justify-start" : "md:justify-end"
                  } items-start md:items-center w-full`}
                >
                  {/* Vertical Line Dot Indicator */}
                  <div className="absolute left-[-22px] md:left-1/2 md:-translate-x-1/2 h-6 w-6 rounded-full bg-bg-base flex items-center justify-center border border-border z-10">
                    <div className={`h-2.5 w-2.5 rounded-full ${colors.dot} animate-pulse`} />
                  </div>

                  {/* Card Container */}
                  <div
                    className={`w-full md:w-[45%] bg-bg-surface border border-border p-5 rounded-card shadow-sm hover:shadow-md transition-shadow relative space-y-3 ${
                      isEven ? "md:mr-auto" : "md:ml-auto"
                    }`}
                  >
                    {/* Event Type Header */}
                    <div className="flex justify-between items-center gap-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${colors.bg} ${colors.text} ${colors.border} border`}>
                        <IconComp className="h-3 w-3 shrink-0" />
                        {event.type.replace("_", " ")}
                      </span>

                      <span className="text-[10px] font-mono text-text-disabled flex items-center gap-1">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {formatEventDate(event.date)}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h4 className="font-display font-bold text-sm text-text-primary">{event.title}</h4>
                      <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                        {event.description}
                      </p>
                    </div>

                    {/* Metadata Badges / Info */}
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/40 mt-3 text-[10px] font-mono">
                        {event.type === "project" && (
                          <>
                            {(event.metadata as any).techStack?.slice(0, 3).map((tech: string, i: number) => (
                              <span key={i} className="bg-bg-elevated px-2 py-0.5 rounded border border-border text-text-secondary">
                                {tech}
                              </span>
                            ))}
                            {(event.metadata as any).githubUrl && (
                              <a
                                href={(event.metadata as any).githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:underline"
                              >
                                Code <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </>
                        )}
                        {event.type === "github_repo" && (
                          <>
                            {(event.metadata as any).language && (
                              <span className="bg-primary/5 border border-primary/20 text-primary px-2 py-0.5 rounded font-bold">
                                {(event.metadata as any).language}
                              </span>
                            )}
                            <span className="text-text-secondary">★ {(event.metadata as any).stars || 0}</span>
                            <span className="text-text-secondary">⌥ {(event.metadata as any).forks || 0}</span>
                          </>
                        )}
                        {event.type === "certification" && (event.metadata as any).credentialUrl && (
                          <a
                            href={(event.metadata as any).credentialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-accent hover:underline font-bold"
                          >
                            Verify Credential <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
