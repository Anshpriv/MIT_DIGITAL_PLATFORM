"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { doc, setDoc, deleteDoc, getDocs, collection } from "firebase/firestore";
import type { Student } from "@/types";
import ProfileCard from "@/components/profile/ProfileCard";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  Bookmark,
  ChevronDown,
  X,
  Code,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { BRANCHES } from "@/types";

export default function CandidateSearchPage() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Student[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Search parameters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [githubOnly, setGithubOnly] = useState<boolean | null>(null);
  const [hackathonOnly, setHackathonOnly] = useState<boolean | null>(null);
  const [certOnly, setCertOnly] = useState<boolean | null>(null);
  const [sortBy, setSortBy] = useState("updatedAt");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Mobile filters overlay toggle
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Load recruiter bookmarks
  useEffect(() => {
    if (!user?.uid) return;
    const uid = user.uid;
    async function loadBookmarks() {
      try {
        const snap = await getDocs(collection(db, "bookmarks", uid, "candidates"));
        const ids = snap.docs.map((doc) => doc.id);
        setBookmarkedIds(new Set(ids));
      } catch (e) {
        console.error("Failed to load bookmarks:", e);
      }
    }
    loadBookmarks();
  }, [user]);

  // Trigger search on filter changes
  useEffect(() => {
    if (!user) return;

    const fetchCandidates = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/recruiter/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recruiterId: user.uid,
            branch: selectedBranches,
            graduationYear: selectedYears,
            skills: selectedSkills,
            githubConnected: githubOnly,
            hackathonParticipant: hackathonOnly,
            hasCertifications: certOnly,
            portfolioScoreRange: scoreRange,
            sortBy,
            page,
            limit: 20,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          // Perform client side query search filter if query text is present
          let filtered = data.candidates || [];
          if (searchQuery.trim()) {
            const queryLower = searchQuery.toLowerCase();
            filtered = filtered.filter(
              (c: Student) =>
                c.name.toLowerCase().includes(queryLower) ||
                c.bio?.toLowerCase().includes(queryLower) ||
                c.skills?.some((s) => s.toLowerCase().includes(queryLower))
            );
          }
          setCandidates(filtered);
          setTotalPages(data.totalPages || 1);
          setTotalCount(data.totalCount || 0);
        } else {
          console.error(data.error);
        }
      } catch (err) {
        console.error("Failed to search candidates:", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchCandidates, 300);
    return () => clearTimeout(timer);
  }, [
    user,
    selectedBranches,
    selectedYears,
    selectedSkills,
    githubOnly,
    hackathonOnly,
    certOnly,
    scoreRange,
    sortBy,
    page,
    searchQuery,
  ]);

  const toggleBookmark = async (studentId: string) => {
    if (!user) return;
    const isBookmarked = bookmarkedIds.has(studentId);
    const updated = new Set(bookmarkedIds);

    try {
      if (isBookmarked) {
        await deleteDoc(doc(db, "bookmarks", user.uid, "candidates", studentId));
        updated.delete(studentId);
      } else {
        await setDoc(doc(db, "bookmarks", user.uid, "candidates", studentId), {
          bookmarkedAt: new Date().toISOString(),
        });
        updated.add(studentId);
      }
      setBookmarkedIds(updated);
    } catch (e) {
      console.error("Failed to toggle bookmark:", e);
    }
  };

  const handleBranchToggle = (branch: string) => {
    setSelectedBranches((prev) =>
      prev.includes(branch) ? prev.filter((b) => b !== branch) : [...prev, branch]
    );
    setPage(1);
  };

  const handleYearToggle = (year: number) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
    setPage(1);
  };

  const addSkillBadge = () => {
    const trimmed = skillInput.trim().toLowerCase();
    if (trimmed && !selectedSkills.includes(trimmed)) {
      setSelectedSkills((prev) => [...prev, trimmed]);
      setSkillInput("");
      setPage(1);
    }
  };

  const removeSkillBadge = (skill: string) => {
    setSelectedSkills((prev) => prev.filter((s) => s !== skill));
    setPage(1);
  };

  const clearFilters = () => {
    setSelectedBranches([]);
    setSelectedYears([]);
    setSelectedSkills([]);
    setScoreRange([0, 100]);
    setGithubOnly(null);
    setHackathonOnly(null);
    setCertOnly(null);
    setSearchQuery("");
    setPage(1);
  };

  const FiltersContent = () => (
    <div className="space-y-6">
      {/* Search query in filter side */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
          Filter Academic Branch
        </h3>
        <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
          {BRANCHES.map((b) => (
            <label key={b} className="flex items-center gap-2.5 text-sm text-text-secondary cursor-pointer hover:text-text-primary">
              <input
                type="checkbox"
                checked={selectedBranches.includes(b)}
                onChange={() => handleBranchToggle(b)}
                className="rounded border-border bg-bg-base text-accent focus:ring-accent h-4 w-4"
              />
              <span>{b}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Graduation Year */}
      <div className="border-t border-border pt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
          Graduation Year
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {[2024, 2025, 2026, 2027, 2028].map((year) => {
            const active = selectedYears.includes(year);
            return (
              <button
                key={year}
                onClick={() => handleYearToggle(year)}
                className={`py-2 px-3 text-xs font-medium rounded border transition-all ${
                  active
                    ? "bg-accent/15 border-accent text-accent"
                    : "bg-bg-base border-border text-text-secondary hover:border-text-secondary"
                }`}
              >
                {year}
              </button>
            );
          })}
        </div>
      </div>

      {/* Skills searchable tag inputs */}
      <div className="border-t border-border pt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
          Skills Filter
        </h3>
        <div className="flex gap-2">
          <input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSkillBadge()}
            placeholder="Search e.g. React"
            className="w-full rounded-input border border-border bg-bg-base px-3 py-2 text-xs text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
          />
          <button
            onClick={addSkillBadge}
            className="bg-bg-elevated border border-border hover:border-accent px-3 py-2 rounded-input text-xs font-medium transition-colors"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {selectedSkills.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent"
            >
              {s}
              <button onClick={() => removeSkillBadge(s)}>
                <X className="h-3 w-3 hover:text-accent-warm" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Portfolio Score Slider */}
      <div className="border-t border-border pt-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Min Portfolio Score
          </h3>
          <span className="text-xs font-mono font-bold text-accent">{scoreRange[0]}</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={scoreRange[0]}
          onChange={(e) => setScoreRange([Number(e.target.value), scoreRange[1]])}
          className="w-full accent-accent h-1 bg-bg-base rounded-lg cursor-pointer"
        />
      </div>

      {/* Quick Toggles */}
      <div className="border-t border-border pt-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Additional Filters
        </h3>

        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">GitHub Connected</span>
          <button
            onClick={() => {
              setPage(1);
              setGithubOnly(githubOnly === true ? null : true);
            }}
            className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
              githubOnly === true ? "bg-accent" : "bg-bg-base border border-border"
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${githubOnly === true ? "transform translate-x-5" : ""}`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Hackathon Participant</span>
          <button
            onClick={() => {
              setPage(1);
              setHackathonOnly(hackathonOnly === true ? null : true);
            }}
            className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
              hackathonOnly === true ? "bg-accent" : "bg-bg-base border border-border"
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${hackathonOnly === true ? "transform translate-x-5" : ""}`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Certified Only</span>
          <button
            onClick={() => {
              setPage(1);
              setCertOnly(certOnly === true ? null : true);
            }}
            className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
              certOnly === true ? "bg-accent" : "bg-bg-base border border-border"
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${certOnly === true ? "transform translate-x-5" : ""}`} />
          </button>
        </div>
      </div>

      {/* Clear Button */}
      <button
        onClick={clearFilters}
        className="w-full mt-4 py-2.5 rounded-button border border-border bg-bg-elevated hover:bg-bg-base text-xs font-semibold text-text-secondary hover:text-text-primary transition-all duration-200"
      >
        Clear All Filters
      </button>
    </div>
  );

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Search Area */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-disabled" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by candidate name, keyword, or bio..."
            className="w-full rounded-input border border-border bg-bg-surface pl-12 pr-4 py-3.5 text-sm text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 transition-all duration-200"
          />
        </div>

        <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-3">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setShowMobileFilters(true)}
            className="md:hidden flex items-center gap-2 border border-border bg-bg-surface px-4 py-2.5 rounded-button text-sm font-semibold hover:border-accent transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono text-text-disabled uppercase">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-bg-surface border border-border text-text-primary text-xs font-semibold rounded-button px-3 py-2 focus:outline-none focus:border-accent cursor-pointer"
            >
              <option value="updatedAt">Latest Updated</option>
              <option value="portfolioScore">Portfolio Score (high-low)</option>
              <option value="githubStars">GitHub Stars</option>
              <option value="graduationYear">Graduation Year</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4 items-start">
        {/* Left Filter Desktop Panel */}
        <aside className="hidden md:block md:col-span-1 rounded-card border border-border bg-bg-surface p-5 sticky top-20 shadow-lg">
          <h2 className="font-display font-bold text-base mb-5 flex items-center gap-2">
            <SlidersHorizontal className="h-4.5 w-4.5 text-accent" /> Search Filters
          </h2>
          <FiltersContent />
        </aside>

        {/* Right Student Grid */}
        <main className="md:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono text-text-disabled uppercase tracking-widest">
              Found {totalCount} Candidates
            </h3>
          </div>

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <span className="text-sm font-mono text-text-secondary">Filtering profiles...</span>
            </div>
          ) : candidates.length === 0 ? (
            <div className="rounded-card border border-dashed border-border bg-bg-surface p-16 text-center">
              <Sparkles className="h-10 w-10 text-text-disabled mx-auto mb-4" />
              <h4 className="font-bold text-text-primary text-base">No candidates match your filters</h4>
              <p className="text-sm text-text-secondary mt-1.5 max-w-sm mx-auto leading-relaxed">
                Try widening your score limits, adding fewer skill filters, or looking across multiple graduation years.
              </p>
              <button
                onClick={clearFilters}
                className="mt-6 bg-accent hover:bg-accent-dark text-bg-base font-semibold px-4 py-2 rounded-button text-xs transition-all"
              >
                Clear Search Parameters
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {candidates.map((student) => (
                  <ProfileCard
                    key={student.uid}
                    student={student}
                    isBookmarked={bookmarkedIds.has(student.uid)}
                    onBookmark={() => toggleBookmark(student.uid)}
                  />
                ))}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-6">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-4 py-2 text-xs font-semibold rounded bg-bg-surface border border-border text-text-secondary hover:text-text-primary disabled:opacity-40 transition-opacity"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-mono text-text-secondary">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-4 py-2 text-xs font-semibold rounded bg-bg-surface border border-border text-text-secondary hover:text-text-primary disabled:opacity-40 transition-opacity"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Filters Slide-over Overlay */}
      <AnimatePresence>
        {showMobileFilters && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileFilters(false)}
              className="fixed inset-0 bg-black z-40"
            />
            {/* Slide-over panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-sm bg-bg-surface border-l border-border p-6 shadow-2xl z-50 overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-display font-bold text-lg flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-accent" /> Search Filters
                </h2>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="p-1 rounded bg-bg-base border border-border text-text-secondary hover:text-text-primary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <FiltersContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
