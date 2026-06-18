"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import type { Student } from "@/types";
import ProfileCard from "@/components/profile/ProfileCard";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen,
  Plus,
  Trash2,
  Download,
  FolderClosed,
  ChevronRight,
  Move,
  Search,
} from "lucide-react";
import Link from "next/link";

interface RecruiterList {
  id: string;
  name: string;
  studentIds: string[];
}

export default function BookmarksPage() {
  const { user } = useAuth();
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [lists, setLists] = useState<RecruiterList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // List creation
  const [newListName, setNewListName] = useState("");
  const [showCreateList, setShowCreateList] = useState(false);

  // Fetch all bookmarked candidates and folders
  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch bookmarked student IDs
      const bookmarksSnap = await getDocs(
        collection(db, "bookmarks", user.uid, "candidates")
      );
      const bIds = bookmarksSnap.docs.map((doc) => doc.id);
      setBookmarkedIds(bIds);

      // 2. Fetch profiles of these student IDs
      const profiles: Student[] = [];
      for (const sId of bIds) {
        const sSnap = await getDoc(doc(db, "students", sId));
        if (sSnap.exists()) {
          profiles.push(sSnap.data() as Student);
        }
      }
      setAllStudents(profiles);

      // 3. Fetch recruiter folders/lists
      const listsSnap = await getDocs(
        collection(db, "recruiterLists", user.uid, "lists")
      );
      const loadedLists = listsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as RecruiterList[];
      setLists(loadedLists);
    } catch (e) {
      console.error("Failed to load bookmarks page details:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Create a new folder
  const handleCreateList = async () => {
    if (!user || !newListName.trim()) return;
    try {
      const listId = Math.random().toString(36).substring(2, 9);
      await setDoc(doc(db, "recruiterLists", user.uid, "lists", listId), {
        name: newListName.trim(),
        studentIds: [],
        createdAt: new Date().toISOString(),
      });
      setNewListName("");
      setShowCreateList(false);
      await loadData();
    } catch (e) {
      console.error("Failed to create list:", e);
    }
  };

  // Delete a folder
  const handleDeleteList = async (listId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this list? Candidates in it will not be deleted.")) return;
    try {
      await deleteDoc(doc(db, "recruiterLists", user.uid, "lists", listId));
      if (selectedListId === listId) {
        setSelectedListId("all");
      }
      await loadData();
    } catch (e) {
      console.error("Failed to delete list:", e);
    }
  };

  // Toggle/remove main bookmark
  const handleRemoveBookmark = async (studentId: string) => {
    if (!user) return;
    try {
      // 1. Delete from bookmarks subcollection
      await deleteDoc(doc(db, "bookmarks", user.uid, "candidates", studentId));

      // 2. Remove from any custom lists
      for (const list of lists) {
        if (list.studentIds.includes(studentId)) {
          const updatedIds = list.studentIds.filter((id) => id !== studentId);
          await updateDoc(doc(db, "recruiterLists", user.uid, "lists", list.id), {
            studentIds: updatedIds,
          });
        }
      }

      await loadData();
    } catch (e) {
      console.error("Failed to remove bookmark:", e);
    }
  };

  // Move candidate to folder
  const handleMoveToList = async (studentId: string, listId: string) => {
    if (!user) return;
    try {
      // 1. Remove from all custom lists first
      for (const list of lists) {
        if (list.studentIds.includes(studentId)) {
          const updatedIds = list.studentIds.filter((id) => id !== studentId);
          await updateDoc(doc(db, "recruiterLists", user.uid, "lists", list.id), {
            studentIds: updatedIds,
          });
        }
      }

      // 2. Add to selected list (if not 'all')
      if (listId !== "all") {
        const targetList = lists.find((l) => l.id === listId);
        if (targetList) {
          const updatedIds = [...new Set([...targetList.studentIds, studentId])];
          await updateDoc(doc(db, "recruiterLists", user.uid, "lists", listId), {
            studentIds: updatedIds,
          });
        }
      }
      await loadData();
    } catch (e) {
      console.error("Failed to move candidate to list:", e);
    }
  };

  // Filter student profiles shown based on active folder
  const activeList = lists.find((l) => l.id === selectedListId);
  const displayedStudents =
    selectedListId === "all"
      ? allStudents
      : allStudents.filter((s) => activeList?.studentIds.includes(s.uid));

  // Export URL helper
  const getExportUrl = () => {
    if (!user) return "#";
    let url = `/api/recruiter/export?recruiterId=${user.uid}`;
    if (selectedListId !== "all") {
      url += `&listId=${selectedListId}`;
    }
    return url;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)] bg-bg-base">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <span className="text-sm font-mono text-text-secondary">Loading lists...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Bookmarks & Shortlists</h1>
          <p className="text-sm text-text-secondary mt-1">
            Organize candidates into custom folders and export selections to CSV.
          </p>
        </div>

        {displayedStudents.length > 0 && (
          <a
            href={getExportUrl()}
            download
            className="flex items-center gap-2 bg-accent hover:bg-accent-dark text-bg-base font-semibold px-4.5 py-2.5 rounded-button text-xs transition-all duration-200 shadow-[0_4px_16px_rgba(0,212,170,0.2)]"
          >
            <Download className="h-4 w-4" /> Export to CSV
          </a>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-4 items-start">
        {/* Left Side: Folders Navigation */}
        <aside className="md:col-span-1 space-y-4">
          <div className="rounded-card border border-border bg-bg-surface p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className="text-xs font-mono text-text-disabled uppercase">Folders</span>
              <button
                onClick={() => setShowCreateList(!showCreateList)}
                className="p-1 rounded bg-bg-base border border-border hover:border-accent text-text-secondary hover:text-accent transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Folder creation box */}
            <AnimatePresence>
              {showCreateList && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="p-2 border border-border rounded bg-bg-base space-y-2 mb-3"
                >
                  <input
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="List name (e.g. Frontend 2025)"
                    className="w-full bg-bg-surface border border-border rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => setShowCreateList(false)}
                      className="px-2 py-1 text-[10px] text-text-secondary hover:text-text-primary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateList}
                      className="px-2.5 py-1 text-[10px] font-semibold bg-accent text-bg-base rounded"
                    >
                      Create
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Folders List */}
            <button
              onClick={() => setSelectedListId("all")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-xs font-semibold text-left transition-colors ${
                selectedListId === "all"
                  ? "bg-accent/10 text-accent"
                  : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
              }`}
            >
              <span className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" /> All Bookmarked
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-bg-base border border-border">
                {allStudents.length}
              </span>
            </button>

            {lists.map((list) => {
              const active = selectedListId === list.id;
              return (
                <div key={list.id} className="group relative flex items-center justify-between">
                  <button
                    onClick={() => setSelectedListId(list.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-xs font-semibold text-left transition-colors ${
                      active
                        ? "bg-accent/10 text-accent"
                        : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate pr-6">
                      <FolderClosed className="h-4 w-4" /> {list.name}
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-bg-base border border-border shrink-0">
                      {list.studentIds.length}
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteList(list.id);
                    }}
                    className="absolute right-9 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:text-accent-warm p-1 transition-all"
                    title="Delete List"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Right Side: Grid of candidate cards */}
        <main className="md:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-accent" />
              {selectedListId === "all" ? "All Bookmarked Candidates" : activeList?.name}
            </h3>
            <span className="text-xs font-mono text-text-disabled">
              Showing {displayedStudents.length} candidates
            </span>
          </div>

          {displayedStudents.length === 0 ? (
            <div className="rounded-card border border-dashed border-border bg-bg-surface p-16 text-center">
              <FolderOpen className="h-10 w-10 text-text-disabled mx-auto mb-4" />
              <h4 className="font-bold text-text-primary text-base">No candidates in this list</h4>
              <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto leading-relaxed">
                {selectedListId === "all"
                  ? "Shortlist candidates from the search screen to populate your bookmarks."
                  : "Move bookmarked students into this folder using the dropdown actions."}
              </p>
              {selectedListId === "all" && (
                <Link
                  href="/recruiter/search"
                  className="mt-6 inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-bg-base font-semibold px-4.5 py-2.5 rounded-button text-xs transition-all duration-200"
                >
                  <Search className="h-3.5 w-3.5" /> Search Students
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayedStudents.map((student) => (
                <div key={student.uid} className="relative group">
                  <ProfileCard
                    student={student}
                    isBookmarked={true}
                    onBookmark={() => handleRemoveBookmark(student.uid)}
                  />

                  {/* List Move Controller Overlay */}
                  <div className="absolute bottom-4 left-4 z-10">
                    <div className="relative inline-block text-left">
                      <select
                        defaultValue={selectedListId}
                        onChange={(e) => handleMoveToList(student.uid, e.target.value)}
                        className="bg-bg-elevated hover:bg-bg-surface border border-border text-text-secondary hover:text-text-primary text-[10px] font-mono rounded px-2 py-1 cursor-pointer transition-colors focus:outline-none"
                      >
                        <option value="all">Unclassified</option>
                        {lists.map((l) => (
                          <option key={l.id} value={l.id}>
                            Move to: {l.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
