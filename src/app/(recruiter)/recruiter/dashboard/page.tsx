"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  limit,
  query,
  orderBy,
  doc,
  getDoc,
  where,
  deleteDoc,
} from "firebase/firestore";
import type { Student } from "@/types";
import ProfileCard from "@/components/profile/ProfileCard";
import { motion } from "framer-motion";
import {
  Users,
  Bookmark,
  Search,
  TrendingUp,
  Activity,
  ArrowRight,
  GraduationCap,
  Calendar,
} from "lucide-react";
import Link from "next/link";

export default function RecruiterDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    bookmarkedCount: 0,
    searchesRun: 12, // Simple display stat
    newStudentsThisWeek: 0,
  });
  const [bookmarkedStudents, setBookmarkedStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<{ id: string; studentName: string; type: string; time: string; desc: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function loadDashboardData() {
      if (!user) return;
      try {
        // 1. Fetch total students count
        const studentsSnap = await getDocs(collection(db, "students"));
        const total = studentsSnap.size;

        // 2. Fetch new students this week (created in last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const newStudents = studentsSnap.docs.filter((d) => {
          const data = d.data();
          const createdAt = data.createdAt ? new Date(data.createdAt) : new Date(0);
          return createdAt >= sevenDaysAgo;
        }).length;

        // 3. Fetch bookmarked student IDs
        const uid = user.uid;
        const bookmarksSnap = await getDocs(
          collection(db, "bookmarks", uid, "candidates")
        );
        const bookmarkedIds = bookmarksSnap.docs.map((doc) => doc.id);
        const bookmarkedCount = bookmarkedIds.length;

        setStats({
          totalStudents: total,
          bookmarkedCount,
          searchesRun: 12 + bookmarkedCount * 2, // dynamic dummy metric
          newStudentsThisWeek: newStudents,
        });

        // 4. Load profiles of bookmarked students
        const loadedStudents: Student[] = [];
        if (bookmarkedIds.length > 0) {
          // Firestore 'in' queries are capped at 30 items
          const idsToFetch = bookmarkedIds.slice(0, 10);
          for (const sId of idsToFetch) {
            const sSnap = await getDoc(doc(db, "students", sId));
            if (sSnap.exists()) {
              loadedStudents.push(sSnap.data() as Student);
            }
          }
          setBookmarkedStudents(loadedStudents);
        }

        // 5. Build mock/real activity feed for bookmarked candidates
        const calculatedActivities = loadedStudents.map((s) => {
          const dateStr = s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : "Recently";
          return {
            id: s.uid,
            studentName: s.name,
            type: "update",
            time: dateStr,
            desc: `Updated their technical skills and portfolio project showcase.`,
          };
        });
        setActivities(calculatedActivities.slice(0, 5));
      } catch (err) {
        console.error("Error loading recruiter dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  const removeBookmark = async (studentId: string) => {
    if (!user?.uid) return;
    const uid = user.uid;
    try {
      await deleteDoc(doc(db, "bookmarks", uid, "candidates", studentId));
      setBookmarkedStudents((prev) => prev.filter((s) => s.uid !== studentId));
      setStats((prev) => ({ ...prev, bookmarkedCount: Math.max(0, prev.bookmarkedCount - 1) }));
    } catch (e) {
      console.error("Failed to remove bookmark:", e);
    }
  };

  const statCards = [
    {
      title: "Students Discovered",
      value: stats.totalStudents,
      change: "+12% this month",
      icon: Users,
      color: "from-primary/20 to-primary/5 border-primary/20 text-primary",
    },
    {
      title: "Profiles Bookmarked",
      value: stats.bookmarkedCount,
      change: "Active shortlists",
      icon: Bookmark,
      color: "from-accent/20 to-accent/5 border-accent/20 text-accent",
    },
    {
      title: "Talent Searches Run",
      value: stats.searchesRun,
      change: "Filter searches",
      icon: Search,
      color: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/20 text-indigo-400",
    },
    {
      title: "New Talent This Week",
      value: stats.newStudentsThisWeek,
      change: "Ready for review",
      icon: TrendingUp,
      color: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)] bg-bg-base">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <span className="text-sm font-mono text-text-secondary">Loading statistics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Welcome Header */}
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Recruiter Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">
          Monitor your candidate shortlists and explore outstanding student profiles at MIT-WPU.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={card.title}
            className={`rounded-card border bg-gradient-to-br ${card.color} p-5 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.15)]`}
          >
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                {card.title}
              </span>
              <h3 className="font-display font-extrabold text-3xl text-text-primary mt-1.5">
                {card.value}
              </h3>
              <span className="text-[10px] text-text-disabled mt-1 block font-mono">
                {card.change}
              </span>
            </div>
            <div className="p-3 bg-bg-surface border border-border rounded-lg shadow-sm">
              <card.icon className="h-5 w-5" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Grid: Bookmarks and Activity */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left 2 Cols: Bookmarks list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-accent" /> Recent Bookmarks
            </h2>
            <Link
              href="/recruiter/bookmarks"
              className="text-xs font-bold text-accent hover:underline flex items-center gap-1 transition-all"
            >
              View all lists <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {bookmarkedStudents.length === 0 ? (
            <div className="rounded-card border border-dashed border-border bg-bg-surface p-12 text-center flex flex-col items-center justify-center">
              <Bookmark className="h-10 w-10 text-text-disabled mb-4" />
              <h4 className="font-bold text-text-primary text-sm">No bookmarks yet</h4>
              <p className="text-xs text-text-secondary mt-1 max-w-xs leading-relaxed">
                Shortlist students from the search directory to keep track of their achievements.
              </p>
              <Link
                href="/recruiter/search"
                className="mt-5 inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-bg-base font-semibold px-4 py-2 rounded-button text-xs transition-all duration-200"
              >
                <Search className="h-3.5 w-3.5" /> Search Candidates
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {bookmarkedStudents.map((student) => (
                <ProfileCard
                  key={student.uid}
                  student={student}
                  isBookmarked={true}
                  onBookmark={() => removeBookmark(student.uid)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Activity Feed */}
        <div className="space-y-6">
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Candidate Activity
          </h2>

          <div className="rounded-card border border-border bg-bg-surface p-5 space-y-5 shadow-lg">
            {activities.length === 0 ? (
              <p className="text-xs text-text-disabled font-mono py-8 text-center">
                No recent activity from bookmarked candidates.
              </p>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="flex gap-3 text-xs leading-relaxed">
                  <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-[10px] shrink-0">
                    {act.studentName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-text-primary">
                      {act.studentName}
                    </div>
                    <p className="text-text-secondary mt-0.5">{act.desc}</p>
                    <div className="text-[10px] text-text-disabled font-mono mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {act.time}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
