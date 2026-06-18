"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadToCloudinary } from "@/lib/upload";
import { BRANCHES, type Branch } from "@/types";
import {
  Loader2,
  Upload,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  FileText,
  Briefcase,
  Trophy,
  Award,
  Globe,
  ExternalLink,
  Bold,
  Italic,
  List,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Zod validation schemas
const basicInfoSchema = z.object({
  avatar: z.string().optional(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  bio: z.string().optional(),
  branch: z.enum(BRANCHES as [Branch, ...Branch[]]),
  graduationYear: z.coerce.number().int().min(2024).max(2030),
  githubUrl: z.string().url("Enter a valid GitHub URL").or(z.literal("")).optional(),
  linkedinUrl: z.string().url("Enter a valid LinkedIn URL").or(z.literal("")).optional(),
  portfolioUrl: z.string().url("Enter a valid Portfolio URL").or(z.literal("")).optional(),
  resumeUrl: z.string().optional(),
});

type BasicInfoData = z.infer<typeof basicInfoSchema>;

// Background narrative update trigger (fire-and-forget)
const triggerTimelineNarrativeAutoUpdate = (uid: string) => {
  fetch("/api/timeline/generate-narrative", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentUid: uid }),
  }).catch((err) => console.warn("Background timeline narrative generation failed:", err));
};

export default function StudentProfileEdit() {
  const { studentProfile, refresh } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("basic");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Read tab parameter from URL if present
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "projects") setActiveTab("projects");
    else if (tabParam === "achievements") setActiveTab("achievements");
    else if (tabParam === "skills") setActiveTab("skills");
  }, [searchParams]);

  // Tab change handler
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Sync with query param without full page reload
    router.replace(`/profile?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-8 p-8 max-w-[1000px] mx-auto w-full text-text-primary">
      {/* Header and Saving Indicator */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Edit Profile</h1>
          <p className="text-sm text-text-secondary mt-1">
            Build your brand. Changes are automatically saved in the background.
          </p>
        </div>

        {/* Saved Status Indicator */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1.5 text-primary">
              <Loader2 className="h-4 w-4 animate-spin" /> Saving changes...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1.5 text-accent">
              <CheckCircle2 className="h-4 w-4" /> All changes saved
            </span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1.5 text-accent-warm">
              <AlertCircle className="h-4 w-4" /> Save failed
            </span>
          )}
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex flex-wrap border-b border-border gap-2 font-display text-sm font-semibold overflow-x-auto pb-px">
        {[
          { id: "basic", label: "Basic Info" },
          { id: "skills", label: "Skills & Tech" },
          { id: "projects", label: "Projects" },
          { id: "achievements", label: "Achievements" },
          { id: "certifications", label: "Certifications" },
          { id: "hackathons", label: "Hackathons" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-3 border-b-2 font-medium transition-all shrink-0 ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="bg-bg-surface border border-border rounded-card p-6 md:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.1)]">
        {activeTab === "basic" && (
          <BasicInfoTab student={studentProfile} setSaveStatus={setSaveStatus} refresh={refresh} />
        )}
        {activeTab === "skills" && (
          <SkillsTab student={studentProfile} setSaveStatus={setSaveStatus} refresh={refresh} />
        )}
        {activeTab === "projects" && (
          <ProjectsTab student={studentProfile} setSaveStatus={setSaveStatus} refresh={refresh} />
        )}
        {activeTab === "achievements" && (
          <AchievementsTab student={studentProfile} setSaveStatus={setSaveStatus} refresh={refresh} />
        )}
        {activeTab === "certifications" && (
          <CertificationsTab student={studentProfile} setSaveStatus={setSaveStatus} refresh={refresh} />
        )}
        {activeTab === "hackathons" && (
          <HackathonsTab student={studentProfile} setSaveStatus={setSaveStatus} refresh={refresh} />
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 1. BASIC INFO TAB COMPONENT
// ----------------------------------------------------
function BasicInfoTab({
  student,
  setSaveStatus,
  refresh,
}: {
  student: any;
  setSaveStatus: any;
  refresh: any;
}) {
  const [avatarProgress, setAvatarProgress] = useState<number | null>(null);
  const [resumeProgress, setResumeProgress] = useState<number | null>(null);
  const bioRef = useRef<HTMLTextAreaElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
    reset,
  } = useForm<BasicInfoData>({
    resolver: zodResolver(basicInfoSchema),
  });

  // Sync initial values
  useEffect(() => {
    if (student) {
      reset({
        avatar: student.avatar || "",
        name: student.name || "",
        bio: student.bio || "",
        branch: student.branch || "Other",
        graduationYear: student.graduationYear || 2026,
        githubUrl: student.githubUrl || "",
        linkedinUrl: student.linkedinUrl || "",
        portfolioUrl: student.portfolioUrl || "",
        resumeUrl: student.resumeUrl || "",
      });
    }
  }, [student, reset]);

  const watchedValues = watch();

  // Debounce Auto-Save
  useEffect(() => {
    if (!isDirty || !student) return;

    setSaveStatus("saving");
    const timer = setTimeout(async () => {
      try {
        const docRef = doc(db, "students", student.uid);
        await updateDoc(docRef, {
          ...watchedValues,
          updatedAt: new Date().toISOString(),
        });
        setSaveStatus("saved");
        await refresh();
      } catch (err) {
        console.error("Auto-save basic info failed", err);
        setSaveStatus("error");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [watchedValues, isDirty, student, setSaveStatus, refresh]);

  // Upload Helpers
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setAvatarProgress(0);
      const url = await uploadToCloudinary(file, "talent-hub/avatars", (pct) => {
        setAvatarProgress(pct);
      });
      setValue("avatar", url, { shouldDirty: true });
      setAvatarProgress(null);
    } catch (err) {
      console.error(err);
      setAvatarProgress(null);
      alert("Failed to upload avatar");
    }
  };

  const handleResumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setResumeProgress(0);
      const url = await uploadToCloudinary(file, "talent-hub/resumes", (pct) => {
        setResumeProgress(pct);
      });
      setValue("resumeUrl", url, { shouldDirty: true });
      setResumeProgress(null);
    } catch (err) {
      console.error(err);
      setResumeProgress(null);
      alert("Failed to upload resume PDF");
    }
  };

  // Custom Rich Text Action Helper
  const formatText = (tag: string) => {
    const textarea = bioRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let formatted = "";
    if (tag === "bold") {
      formatted = `<strong>${selectedText || "bold text"}</strong>`;
    } else if (tag === "italic") {
      formatted = `<em>${selectedText || "italic text"}</em>`;
    } else if (tag === "list") {
      formatted = `\n<ul>\n  <li>${selectedText || "list item"}</li>\n</ul>`;
    }

    const newValue = text.substring(0, start) + formatted + text.substring(end);
    setValue("bio", newValue, { shouldDirty: true });

    // Refocus & reset selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + formatted.length);
    }, 0);
  };

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        {/* Avatar Upload */}
        <div className="relative group">
          <div className="h-20 w-20 rounded-full bg-bg-base border border-border flex items-center justify-center text-text-secondary overflow-hidden shrink-0">
            {watchedValues.avatar ? (
              <img src={watchedValues.avatar} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <Upload className="h-6 w-6 text-text-disabled" />
            )}
          </div>
          {avatarProgress !== null && (
            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
              <span className="font-mono text-xs font-bold text-white">{avatarProgress}%</span>
            </div>
          )}
          <label className="absolute inset-0 rounded-full cursor-pointer hover:bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </label>
        </div>

        <div>
          <h3 className="font-bold text-sm">Profile Avatar</h3>
          <p className="text-xs text-text-secondary mt-1">Recommended size: 256x256px PNG or JPG.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Full Name</span>
          <input
            {...register("name")}
            className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
          />
          {errors.name?.message && (
            <span className="mt-1 block text-xs text-accent-warm font-mono">{errors.name.message}</span>
          )}
        </div>

        <div className="grid gap-4 grid-cols-2">
          <div className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Branch</span>
            <select
              {...register("branch")}
              className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
            >
              {BRANCHES.map((b) => (
                <option key={b} value={b} className="bg-bg-surface text-text-primary">
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Graduation Year</span>
            <select
              {...register("graduationYear")}
              className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                <option key={y} value={y} className="bg-bg-surface text-text-primary">
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Rich Text Bio */}
      <div className="block">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Bio</span>
          {/* Formatting Controls */}
          <div className="flex items-center gap-1 bg-bg-base border border-border rounded px-1.5 py-0.5">
            <button
              type="button"
              onClick={() => formatText("bold")}
              className="p-1 rounded hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
              title="Bold"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => formatText("italic")}
              className="p-1 rounded hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
              title="Italic"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => formatText("list")}
              className="p-1 rounded hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
              title="Bullet List"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <textarea
          ref={(e) => {
            register("bio").ref(e);
            (bioRef as any).current = e;
          }}
          name="bio"
          onChange={(e) => setValue("bio", e.target.value, { shouldDirty: true })}
          value={watchedValues.bio || ""}
          rows={4}
          className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
          placeholder="Brief description about yourself (Markdown/HTML tags are supported)..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">GitHub URL</span>
          <input
            {...register("githubUrl")}
            className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
            placeholder="https://github.com/username"
          />
          {errors.githubUrl?.message && (
            <span className="mt-1 block text-xs text-accent-warm font-mono">{errors.githubUrl.message}</span>
          )}
        </div>

        <div className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">LinkedIn URL</span>
          <input
            {...register("linkedinUrl")}
            className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
            placeholder="https://linkedin.com/in/username"
          />
          {errors.linkedinUrl?.message && (
            <span className="mt-1 block text-xs text-accent-warm font-mono">{errors.linkedinUrl.message}</span>
          )}
        </div>

        <div className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Portfolio URL</span>
          <input
            {...register("portfolioUrl")}
            className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
            placeholder="https://yourwebsite.com"
          />
          {errors.portfolioUrl?.message && (
            <span className="mt-1 block text-xs text-accent-warm font-mono">{errors.portfolioUrl.message}</span>
          )}
        </div>
      </div>

      {/* Resume PDF */}
      <div className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Resume PDF</span>
        <div className="flex items-center gap-4 border border-border rounded-input bg-bg-base p-4">
          <div className="h-10 w-10 bg-bg-elevated border border-border rounded flex items-center justify-center text-text-disabled">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            {watchedValues.resumeUrl ? (
              <a
                href={watchedValues.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-primary hover:underline truncate block"
              >
                View Current Resume PDF
              </a>
            ) : (
              <p className="text-xs text-text-secondary">No resume PDF uploaded yet.</p>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              className="bg-bg-elevated hover:bg-bg-surface border border-border px-4 py-2 rounded-button text-xs font-bold transition-all inline-flex items-center gap-1.5"
            >
              {resumeProgress !== null ? `Uploading ${resumeProgress}%` : "Choose File"}
            </button>
            <input
              type="file"
              accept=".pdf"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleResumeChange}
              disabled={resumeProgress !== null}
            />
          </div>
        </div>
      </div>
    </form>
  );
}

// ----------------------------------------------------
// 2. SKILLS & TECH TAB COMPONENT
// ----------------------------------------------------
function SkillsTab({
  student,
  setSaveStatus,
  refresh,
}: {
  student: any;
  setSaveStatus: any;
  refresh: any;
}) {
  const [skills, setSkills] = useState<string[]>([]);
  const [techStack, setTechStack] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [techInput, setTechInput] = useState("");
  const [dirty, setDirty] = useState(false);

  // Load Initial tags
  useEffect(() => {
    if (student) {
      setSkills(student.skills || []);
      setTechStack(student.techStack || []);
    }
  }, [student]);

  // Debounced Auto-Save
  useEffect(() => {
    if (!dirty || !student) return;

    setSaveStatus("saving");
    const timer = setTimeout(async () => {
      try {
        const docRef = doc(db, "students", student.uid);
        await updateDoc(docRef, {
          skills,
          techStack,
          updatedAt: new Date().toISOString(),
        });
        setSaveStatus("saved");
        setDirty(false);
        await refresh();
      } catch (err) {
        console.error("Auto-save skills failed", err);
        setSaveStatus("error");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [skills, techStack, dirty, student, setSaveStatus, refresh]);

  // Add tag
  const addSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillInput.trim()) return;
    if (!skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setDirty(true);
    }
    setSkillInput("");
  };

  const addTech = (e: React.FormEvent) => {
    e.preventDefault();
    if (!techInput.trim()) return;
    if (!techStack.includes(techInput.trim())) {
      setTechStack([...techStack, techInput.trim()]);
      setDirty(true);
    }
    setTechInput("");
  };

  // Delete tag
  const deleteSkill = (idx: number) => {
    setSkills(skills.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const deleteTech = (idx: number) => {
    setTechStack(techStack.filter((_, i) => i !== idx));
    setDirty(true);
  };

  // Reorder buttons (Move Up / Down)
  const moveSkill = (idx: number, dir: "up" | "down") => {
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= skills.length) return;

    const reordered = [...skills];
    const temp = reordered[idx];
    reordered[idx] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    setSkills(reordered);
    setDirty(true);
  };

  const moveTech = (idx: number, dir: "up" | "down") => {
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= techStack.length) return;

    const reordered = [...techStack];
    const temp = reordered[idx];
    reordered[idx] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    setTechStack(reordered);
    setDirty(true);
  };

  return (
    <div className="space-y-8">
      {/* Skills */}
      <div className="space-y-4">
        <div>
          <h3 className="font-display text-lg font-bold">Core Skills</h3>
          <p className="text-xs text-text-secondary mt-1">
            Display your top skills to recruiters. Use move buttons to reorder.
          </p>
        </div>

        <form onSubmit={addSkill} className="flex gap-2">
          <input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            className="flex-1 rounded-input border border-border bg-bg-base px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
            placeholder="e.g. Next.js, Machine Learning, UI Design"
          />
          <button
            type="submit"
            className="bg-primary hover:bg-primary-dark transition-all rounded-button px-4 text-xs font-bold text-white inline-flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </form>

        <div className="flex flex-col gap-2">
          {skills.map((skill, idx) => (
            <div
              key={skill}
              className="flex items-center justify-between bg-bg-base border border-border px-3 py-2 rounded-lg"
            >
              <span className="font-mono text-xs font-medium text-text-secondary">{skill}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveSkill(idx, "up")}
                  className="p-1 text-text-disabled hover:text-text-primary disabled:opacity-35"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === skills.length - 1}
                  onClick={() => moveSkill(idx, "down")}
                  className="p-1 text-text-disabled hover:text-text-primary disabled:opacity-35"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteSkill(idx)}
                  className="p-1 text-text-disabled hover:text-accent-warm ml-2"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="space-y-4 pt-6 border-t border-border">
        <div>
          <h3 className="font-display text-lg font-bold">Technologies & Frameworks</h3>
          <p className="text-xs text-text-secondary mt-1">
            General development tools, databases, libraries, etc.
          </p>
        </div>

        <form onSubmit={addTech} className="flex gap-2">
          <input
            value={techInput}
            onChange={(e) => setTechInput(e.target.value)}
            className="flex-1 rounded-input border border-border bg-bg-base px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
            placeholder="e.g. Firebase, Docker, PostgreSQL, TailwindCSS"
          />
          <button
            type="submit"
            className="bg-primary hover:bg-primary-dark transition-all rounded-button px-4 text-xs font-bold text-white inline-flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </form>

        <div className="flex flex-col gap-2">
          {techStack.map((tech, idx) => (
            <div
              key={tech}
              className="flex items-center justify-between bg-bg-base border border-border px-3 py-2 rounded-lg"
            >
              <span className="font-mono text-xs font-medium text-text-secondary">{tech}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveTech(idx, "up")}
                  className="p-1 text-text-disabled hover:text-text-primary disabled:opacity-35"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === techStack.length - 1}
                  onClick={() => moveTech(idx, "down")}
                  className="p-1 text-text-disabled hover:text-text-primary disabled:opacity-35"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteTech(idx)}
                  className="p-1 text-text-disabled hover:text-accent-warm ml-2"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 3. PROJECTS TAB COMPONENT
// ----------------------------------------------------
function ProjectsTab({
  student,
  setSaveStatus,
  refresh,
}: {
  student: any;
  setSaveStatus: any;
  refresh: any;
}) {
  const [projects, setProjects] = useState<any[]>([]);
  const [editingProjId, setEditingProjId] = useState<string | null>(null);
  const [thumbnailProgress, setThumbnailProgress] = useState<number | null>(null);

  // Form hooks for the Add/Edit form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      description: "",
      techStackString: "",
      githubUrl: "",
      liveUrl: "",
      thumbnailUrl: "",
      featured: false,
    },
  });

  useEffect(() => {
    if (student) {
      setProjects(student.projects || []);
    }
  }, [student]);

  const watchedValues = watch();

  // Save full list to firestore
  const saveProjectsList = async (updatedList: any[]) => {
    if (!student) return;
    setSaveStatus("saving");
    try {
      const docRef = doc(db, "students", student.uid);
      await updateDoc(docRef, {
        projects: updatedList,
        updatedAt: new Date().toISOString(),
      });
      setSaveStatus("saved");
      await refresh();
      triggerTimelineNarrativeAutoUpdate(student.uid);
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
    }
  };

  const handleEdit = (proj: any) => {
    setEditingProjId(proj.id);
    reset({
      name: proj.name,
      description: proj.description,
      techStackString: proj.techStack?.join(", ") || "",
      githubUrl: proj.githubUrl || "",
      liveUrl: proj.liveUrl || "",
      thumbnailUrl: proj.thumbnailUrl || "",
      featured: proj.featured || false,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    await saveProjectsList(updated);
  };

  const onSubmitForm = async (data: any) => {
    const parsedTech = data.techStackString
      ? data.techStackString.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

    const newProjectData = {
      id: editingProjId || Math.random().toString(36).substring(2, 9),
      name: data.name,
      description: data.description,
      techStack: parsedTech,
      githubUrl: data.githubUrl || "",
      liveUrl: data.liveUrl || "",
      thumbnailUrl: data.thumbnailUrl || "",
      featured: data.featured,
    };

    let updatedList = [];
    if (editingProjId) {
      updatedList = projects.map((p) => (p.id === editingProjId ? newProjectData : p));
    } else {
      updatedList = [...projects, newProjectData];
    }

    setProjects(updatedList);
    await saveProjectsList(updatedList);
    setEditingProjId(null);
    reset({
      name: "",
      description: "",
      techStackString: "",
      githubUrl: "",
      liveUrl: "",
      thumbnailUrl: "",
      featured: false,
    });
  };

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setThumbnailProgress(0);
      const url = await uploadToCloudinary(file, "talent-hub/project-thumbnails", (pct) => {
        setThumbnailProgress(pct);
      });
      setValue("thumbnailUrl", url);
      setThumbnailProgress(null);
    } catch (err) {
      console.error(err);
      setThumbnailProgress(null);
      alert("Failed to upload thumbnail image");
    }
  };

  return (
    <div className="space-y-8">
      {/* Existing projects list */}
      <div className="space-y-4">
        <h3 className="font-display text-lg font-bold">Featured Projects</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((proj) => (
            <div key={proj.id} className="border border-border rounded-lg p-4 bg-bg-base flex flex-col justify-between">
              <div>
                <h4 className="font-bold flex items-center justify-between text-sm">
                  {proj.name}
                  {proj.featured && <span className="text-[9px] bg-primary/10 text-primary px-1 rounded">FEATURED</span>}
                </h4>
                <p className="text-xs text-text-secondary mt-1.5 line-clamp-3 leading-relaxed">
                  {proj.description}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
                <span className="text-[10px] text-text-disabled font-mono">
                  {proj.techStack?.slice(0, 2).join(", ")}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(proj)} className="text-xs text-primary font-bold hover:underline">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(proj.id)} className="text-xs text-accent-warm font-bold hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Form */}
      <div className="border-t border-border pt-6 space-y-4">
        <h4 className="font-display text-base font-bold">{editingProjId ? "Edit Project" : "Add Project"}</h4>
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Project Name</span>
              <input
                {...register("name", { required: "Project name is required" })}
                className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                placeholder="e.g. Talent Hub Web App"
              />
            </div>
            <div className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Tech Stack</span>
              <input
                {...register("techStackString")}
                className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                placeholder="Comma separated: React, Tailwind, Firebase"
              />
            </div>
          </div>

          <div className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Description</span>
            <textarea
              {...register("description", { required: "Description is required" })}
              rows={3}
              className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
              placeholder="What does it do? How did you build it?"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">GitHub URL</span>
              <input
                {...register("githubUrl")}
                className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                placeholder="https://github.com/..."
              />
            </div>
            <div className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Live Demo URL</span>
              <input
                {...register("liveUrl")}
                className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Thumbnail image and Featured toggle */}
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between border border-border bg-bg-base p-4 rounded-input">
            <div className="flex items-center gap-4">
              <div className="h-12 w-20 rounded bg-bg-elevated border border-border flex items-center justify-center text-text-disabled overflow-hidden">
                {watchedValues.thumbnailUrl ? (
                  <img src={watchedValues.thumbnailUrl} alt="thumbnail" className="h-full w-full object-cover" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </div>
              <div className="relative">
                <button
                  type="button"
                  className="bg-bg-elevated hover:bg-bg-surface border border-border px-3 py-1.5 rounded-button text-xs font-bold transition-all"
                >
                  {thumbnailProgress !== null ? `Uploading ${thumbnailProgress}%` : "Upload Thumbnail"}
                </button>
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleThumbnailChange}
                  disabled={thumbnailProgress !== null}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register("featured")} className="rounded border-border text-primary focus:ring-primary/20 h-4 w-4 bg-bg-base" />
              <span className="text-xs font-bold text-text-secondary">Feature this project</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {editingProjId && (
              <button
                type="button"
                onClick={() => {
                  setEditingProjId(null);
                  reset();
                }}
                className="border border-border bg-bg-elevated px-4 py-2 rounded-button text-xs font-bold hover:border-primary"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="bg-primary hover:bg-primary-dark transition-all rounded-button px-5 py-2 text-xs font-bold text-white shadow-md"
            >
              {editingProjId ? "Update Project" : "Add Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 4. ACHIEVEMENTS TAB COMPONENT
// ----------------------------------------------------
function AchievementsTab({
  student,
  setSaveStatus,
  refresh,
}: {
  student: any;
  setSaveStatus: any;
  refresh: any;
}) {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [editingAchId, setEditingAchId] = useState<string | null>(null);
  const [certProgress, setCertProgress] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
  } = useForm({
    defaultValues: {
      title: "",
      event: "",
      date: "",
      position: "",
      description: "",
      certificateUrl: "",
    },
  });

  useEffect(() => {
    if (student) {
      setAchievements(student.achievements || []);
    }
  }, [student]);

  const watchedValues = watch();

  const saveAchievementsList = async (updatedList: any[]) => {
    if (!student) return;
    setSaveStatus("saving");
    try {
      const docRef = doc(db, "students", student.uid);
      await updateDoc(docRef, {
        achievements: updatedList,
        updatedAt: new Date().toISOString(),
      });
      setSaveStatus("saved");
      await refresh();
      triggerTimelineNarrativeAutoUpdate(student.uid);
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
    }
  };

  const handleEdit = (ach: any) => {
    setEditingAchId(ach.id);
    reset(ach);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    const updated = achievements.filter((a) => a.id !== id);
    setAchievements(updated);
    await saveAchievementsList(updated);
  };

  const onSubmitForm = async (data: any) => {
    const newAchData = {
      id: editingAchId || Math.random().toString(36).substring(2, 9),
      title: data.title,
      event: data.event,
      date: data.date,
      position: data.position || "",
      description: data.description || "",
      certificateUrl: data.certificateUrl || "",
    };

    let updatedList = [];
    if (editingAchId) {
      updatedList = achievements.map((a) => (a.id === editingAchId ? newAchData : a));
    } else {
      updatedList = [...achievements, newAchData];
    }

    setAchievements(updatedList);
    await saveAchievementsList(updatedList);
    setEditingAchId(null);
    reset();
  };

  const handleCertChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCertProgress(0);
      const url = await uploadToCloudinary(file, "talent-hub/certificates", (pct) => {
        setCertProgress(pct);
      });
      setValue("certificateUrl", url);
      setCertProgress(null);
    } catch (err) {
      console.error(err);
      setCertProgress(null);
      alert("Failed to upload certificate image");
    }
  };

  return (
    <div className="space-y-8">
      {/* Existing List */}
      <div className="space-y-4">
        <h3 className="font-display text-lg font-bold">Achievements & Honors</h3>
        <div className="space-y-3">
          {achievements.map((ach) => (
            <div key={ach.id} className="border border-border rounded-lg p-4 bg-bg-base flex justify-between items-center">
              <div>
                <h4 className="font-bold text-sm">
                  {ach.title} {ach.position && <span className="text-xs text-accent-warm font-mono">({ach.position})</span>}
                </h4>
                <p className="text-xs text-text-secondary mt-0.5">{ach.event} &middot; {ach.date}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(ach)} className="text-xs text-primary font-bold hover:underline">
                  Edit
                </button>
                <button onClick={() => handleDelete(ach.id)} className="text-xs text-accent-warm font-bold hover:underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Form */}
      <div className="border-t border-border pt-6 space-y-4">
        <h4 className="font-display text-base font-bold">{editingAchId ? "Edit Achievement" : "Add Achievement"}</h4>
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Title</span>
              <input
                {...register("title", { required: true })}
                className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                placeholder="e.g. 1st Place Winner"
              />
            </div>
            <div className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Event Name</span>
              <input
                {...register("event", { required: true })}
                className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                placeholder="e.g. Smart India Hackathon"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Date</span>
              <input
                {...register("date", { required: true })}
                className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                placeholder="e.g. March 2026"
              />
            </div>
            <div className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Position / Role</span>
              <input
                {...register("position")}
                className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                placeholder="e.g. Lead Developer"
              />
            </div>
          </div>

          <div className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Description</span>
            <textarea
              {...register("description")}
              rows={3}
              className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
              placeholder="Brief details about your role and what you achieved..."
            />
          </div>

          {/* Certificate upload */}
          <div className="flex items-center gap-4 border border-border bg-bg-base p-4 rounded-input">
            <div className="h-10 w-10 bg-bg-elevated border border-border rounded flex items-center justify-center text-text-disabled">
              <Award className="h-5 w-5" />
            </div>
            <div className="flex-1">
              {watchedValues.certificateUrl ? (
                <span className="text-xs text-accent font-semibold block">Certificate Uploaded</span>
              ) : (
                <span className="text-xs text-text-secondary block">No certificate uploaded.</span>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                className="bg-bg-elevated hover:bg-bg-surface border border-border px-3 py-1.5 rounded-button text-xs font-bold transition-all"
              >
                {certProgress !== null ? `Uploading ${certProgress}%` : "Upload Certificate"}
              </button>
              <input
                type="file"
                accept="image/*,.pdf"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleCertChange}
                disabled={certProgress !== null}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {editingAchId && (
              <button
                type="button"
                onClick={() => {
                  setEditingAchId(null);
                  reset();
                }}
                className="border border-border bg-bg-elevated px-4 py-2 rounded-button text-xs font-bold hover:border-primary"
              >
                Cancel
              </button>
            )}
            <button type="submit" className="bg-primary hover:bg-primary-dark transition-all rounded-button px-5 py-2 text-xs font-bold text-white">
              {editingAchId ? "Update Achievement" : "Add Achievement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 5. CERTIFICATIONS TAB COMPONENT
// ----------------------------------------------------
function CertificationsTab({
  student,
  setSaveStatus,
  refresh,
}: {
  student: any;
  setSaveStatus: any;
  refresh: any;
}) {
  const [certs, setCerts] = useState<any[]>([]);
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [logoProgress, setLogoProgress] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
  } = useForm({
    defaultValues: {
      name: "",
      issuer: "",
      date: "",
      credentialUrl: "",
      logoUrl: "",
    },
  });

  useEffect(() => {
    if (student) {
      setCerts(student.certifications || []);
    }
  }, [student]);

  const watchedValues = watch();

  const saveCertsList = async (updatedList: any[]) => {
    if (!student) return;
    setSaveStatus("saving");
    try {
      const docRef = doc(db, "students", student.uid);
      await updateDoc(docRef, {
        certifications: updatedList,
        updatedAt: new Date().toISOString(),
      });
      setSaveStatus("saved");
      await refresh();
      triggerTimelineNarrativeAutoUpdate(student.uid);
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
    }
  };

  const handleEdit = (c: any) => {
    setEditingCertId(c.id);
    reset(c);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    const updated = certs.filter((c) => c.id !== id);
    setCerts(updated);
    await saveCertsList(updated);
  };

  const onSubmitForm = async (data: any) => {
    const newCertData = {
      id: editingCertId || Math.random().toString(36).substring(2, 9),
      name: data.name,
      issuer: data.issuer,
      date: data.date,
      credentialUrl: data.credentialUrl || "",
      logoUrl: data.logoUrl || "",
    };

    let updatedList = [];
    if (editingCertId) {
      updatedList = certs.map((c) => (c.id === editingCertId ? newCertData : c));
    } else {
      updatedList = [...certs, newCertData];
    }

    setCerts(updatedList);
    await saveCertsList(updatedList);
    setEditingCertId(null);
    reset();
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLogoProgress(0);
      const url = await uploadToCloudinary(file, "talent-hub/certificates", (pct) => {
        setLogoProgress(pct);
      });
      setValue("logoUrl", url);
      setLogoProgress(null);
    } catch (err) {
      console.error(err);
      setLogoProgress(null);
      alert("Failed to upload issuer logo");
    }
  };

  return (
    <div className="space-y-8">
      {/* Existing List */}
      <div className="space-y-4">
        <h3 className="font-display text-lg font-bold">Certifications</h3>
        <div className="space-y-3">
          {certs.map((c) => (
            <div key={c.id} className="border border-border rounded-lg p-4 bg-bg-base flex justify-between items-center">
              <div>
                <h4 className="font-bold text-sm">{c.name}</h4>
                <p className="text-xs text-text-secondary mt-0.5">{c.issuer} &middot; {c.date}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(c)} className="text-xs text-primary font-bold hover:underline">
                  Edit
                </button>
                <button onClick={() => handleDelete(c.id)} className="text-xs text-accent-warm font-bold hover:underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Form */}
      <div className="border-t border-border pt-6 space-y-4">
        <h4 className="font-display text-base font-bold">{editingCertId ? "Edit Certification" : "Add Certification"}</h4>
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Certification Name</span>
              <input
                {...register("name", { required: true })}
                className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                placeholder="e.g. AWS Certified Developer"
              />
            </div>
            <div className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Issuer</span>
              <input
                {...register("issuer", { required: true })}
                className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                placeholder="e.g. Amazon Web Services"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Date Issued</span>
              <input
                {...register("date", { required: true })}
                className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                placeholder="e.g. January 2026"
              />
            </div>
            <div className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Credential URL</span>
              <input
                {...register("credentialUrl")}
                className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Logo Upload */}
          <div className="flex items-center gap-4 border border-border bg-bg-base p-4 rounded-input">
            <div className="h-10 w-10 bg-bg-elevated border border-border rounded flex items-center justify-center text-text-disabled overflow-hidden">
              {watchedValues.logoUrl ? (
                <img src={watchedValues.logoUrl} alt="logo" className="h-full w-full object-cover" />
              ) : (
                <Award className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1">
              <span className="text-xs text-text-secondary block">Issuer Logo</span>
            </div>
            <div className="relative">
              <button
                type="button"
                className="bg-bg-elevated hover:bg-bg-surface border border-border px-3 py-1.5 rounded-button text-xs font-bold transition-all"
              >
                {logoProgress !== null ? `Uploading ${logoProgress}%` : "Upload Logo"}
              </button>
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleLogoChange}
                disabled={logoProgress !== null}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {editingCertId && (
              <button
                type="button"
                onClick={() => {
                  setEditingCertId(null);
                  reset();
                }}
                className="border border-border bg-bg-elevated px-4 py-2 rounded-button text-xs font-bold hover:border-primary"
              >
                Cancel
              </button>
            )}
            <button type="submit" className="bg-primary hover:bg-primary-dark transition-all rounded-button px-5 py-2 text-xs font-bold text-white">
              {editingCertId ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 6. HACKATHONS TAB COMPONENT
// ----------------------------------------------------
function HackathonsTab({
  student,
  setSaveStatus,
  refresh,
}: {
  student: any;
  setSaveStatus: any;
  refresh: any;
}) {
  const [hackathons, setHackathons] = useState<any[]>([]);
  const [editingHackId, setEditingHackId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
  } = useForm({
    defaultValues: {
      event: "",
      date: "",
      teamSize: 1,
      projectBuilt: "",
      result: "participant" as "winner" | "finalist" | "participant",
      description: "",
    },
  });

  useEffect(() => {
    if (student) {
      setHackathons(student.hackathons || []);
    }
  }, [student]);

  const saveHackathonsList = async (updatedList: any[]) => {
    if (!student) return;
    setSaveStatus("saving");
    try {
      const docRef = doc(db, "students", student.uid);
      await updateDoc(docRef, {
        hackathons: updatedList,
        updatedAt: new Date().toISOString(),
      });
      setSaveStatus("saved");
      await refresh();
      triggerTimelineNarrativeAutoUpdate(student.uid);
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
    }
  };

  const handleEdit = (h: any) => {
    setEditingHackId(h.id);
    reset(h);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    const updated = hackathons.filter((h) => h.id !== id);
    setHackathons(updated);
    await saveHackathonsList(updated);
  };

  const onSubmitForm = async (data: any) => {
    const newHackData = {
      id: editingHackId || Math.random().toString(36).substring(2, 9),
      event: data.event,
      date: data.date,
      teamSize: Number(data.teamSize) || 1,
      projectBuilt: data.projectBuilt || "",
      result: data.result,
      description: data.description || "",
    };

    let updatedList = [];
    if (editingHackId) {
      updatedList = hackathons.map((h) => (h.id === editingHackId ? newHackData : h));
    } else {
      updatedList = [...hackathons, newHackData];
    }

    setHackathons(updatedList);
    await saveHackathonsList(updatedList);
    setEditingHackId(null);
    reset();
  };

  return (
    <div className="space-y-8">
      {/* Existing List */}
      <div className="space-y-4">
        <h3 className="font-display text-lg font-bold">Hackathon Participations</h3>
        <div className="space-y-3">
          {hackathons.map((h) => (
            <div key={h.id} className="border border-border rounded-lg p-4 bg-bg-base flex justify-between items-center">
              <div>
                <h4 className="font-bold text-sm">
                  {h.event}{" "}
                  <span className="text-[10px] uppercase font-bold font-mono px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/20 ml-2">
                    {h.result}
                  </span>
                </h4>
                <p className="text-xs text-text-secondary mt-0.5">Project: {h.projectBuilt || "N/A"} &middot; {h.date}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(h)} className="text-xs text-primary font-bold hover:underline">
                  Edit
                </button>
                <button onClick={() => handleDelete(h.id)} className="text-xs text-accent-warm font-bold hover:underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Form */}
      <div className="border-t border-border pt-6 space-y-4">
        <h4 className="font-display text-base font-bold">{editingHackId ? "Edit Hackathon" : "Add Hackathon"}</h4>
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Event Name</span>
              <input
                {...register("event", { required: true })}
                className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                placeholder="e.g. Pune Tech Hackathon"
              />
            </div>
            <div className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Date</span>
              <input
                {...register("date", { required: true })}
                className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                placeholder="e.g. February 2026"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Team Size</span>
              <input
                type="number"
                {...register("teamSize", { required: true, min: 1 })}
                className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                placeholder="e.g. 4"
              />
            </div>
            <div className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Project Built</span>
              <input
                {...register("projectBuilt")}
                className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                placeholder="e.g. Healthcare Monitoring App"
              />
            </div>
          </div>

          <div className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Result</span>
            <select
              {...register("result")}
              className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
            >
              <option value="participant">Participant</option>
              <option value="finalist">Finalist</option>
              <option value="winner">Winner</option>
            </select>
          </div>

          <div className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Description</span>
            <textarea
              {...register("description")}
              rows={3}
              className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
              placeholder="What did you build? What technologies did you use?"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {editingHackId && (
              <button
                type="button"
                onClick={() => {
                  setEditingHackId(null);
                  reset();
                }}
                className="border border-border bg-bg-elevated px-4 py-2 rounded-button text-xs font-bold hover:border-primary"
              >
                Cancel
              </button>
            )}
            <button type="submit" className="bg-primary hover:bg-primary-dark transition-all rounded-button px-5 py-2 text-xs font-bold text-white">
              {editingHackId ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
