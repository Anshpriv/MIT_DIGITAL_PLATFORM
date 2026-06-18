import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Check, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getDb } from "@/lib/firebase";
import { uploadFile } from "@/lib/upload";
import { BRANCHES, type Branch, type Achievement, type Certification, type HackathonEntry, type Project, type Student } from "@/types";
import { TagInput } from "@/components/ui/TagInput";

export const Route = createFileRoute("/dashboard/profile")({
  ssr: false,
  component: ProfilePage,
});

type Tab = "basic" | "skills" | "projects" | "achievements" | "certifications" | "hackathons";

const tabs: { id: Tab; label: string }[] = [
  { id: "basic", label: "Basic Info" },
  { id: "skills", label: "Skills & Tech" },
  { id: "projects", label: "Projects" },
  { id: "achievements", label: "Achievements" },
  { id: "certifications", label: "Certifications" },
  { id: "hackathons", label: "Hackathons" },
];

const inputCls =
  "w-full rounded-lg border border-border bg-elevated px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function ProfilePage() {
  const { user, studentProfile, refresh } = useAuth();
  const [tab, setTab] = useState<Tab>("basic");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [draft, setDraft] = useState(studentProfile);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAutosave = useRef(true);

  useEffect(() => {
    setDraft(studentProfile);
    skipAutosave.current = true;
  }, [studentProfile]);

  // Debounced autosave
  useEffect(() => {
    if (!user || !draft) return;
    if (skipAutosave.current) { skipAutosave.current = false; return; }
    if (timer.current) clearTimeout(timer.current);
    setSaving("saving");
    timer.current = setTimeout(async () => {
      try {
        const { uid: _uid, createdAt: _c, ...rest } = draft;
        await updateDoc(doc(getDb(), "students", user.uid), {
          ...rest,
          updatedAt: serverTimestamp(),
        });
        setSaving("saved");
        setTimeout(() => setSaving("idle"), 1500);
      } catch (e) {
        console.error(e);
        setSaving("idle");
      }
    }, 1500);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  if (!draft) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  function patch<K extends keyof Student>(key: K, value: Student[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  async function onAvatarUpload(file: File) {
    if (!user) return;
    const url = await uploadFile(`avatars/${user.uid}/${Date.now()}-${file.name}`, file);
    patch("avatar", url);
  }
  async function onResumeUpload(file: File) {
    if (!user) return;
    const url = await uploadFile(`resumes/${user.uid}/${Date.now()}-${file.name}`, file);
    patch("resumeUrl", url);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">My Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Changes save automatically.</p>
        </div>
        <SaveIndicator state={saving} />
      </header>

      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              tab === t.id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card-hub p-6">
        {tab === "basic" && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-accent text-2xl font-bold text-white">
                {draft.avatar ? <img src={draft.avatar} alt="" className="h-full w-full object-cover" /> : draft.name?.[0]?.toUpperCase()}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-2 text-sm hover:border-primary transition-colors">
                <Upload className="h-4 w-4" /> Upload avatar
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onAvatarUpload(e.target.files[0])} />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name">
                <input value={draft.name ?? ""} onChange={(e) => patch("name", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Branch">
                <select value={draft.branch ?? ""} onChange={(e) => patch("branch", e.target.value as Branch)} className={inputCls}>
                  {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="Graduation year">
                <input type="number" value={draft.graduationYear ?? ""} onChange={(e) => patch("graduationYear", Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Public profile?">
                <select value={String(draft.isProfilePublic)} onChange={(e) => patch("isProfilePublic", e.target.value === "true")} className={inputCls}>
                  <option value="true">Public — visible to recruiters</option>
                  <option value="false">Private</option>
                </select>
              </Field>
            </div>

            <Field label="Bio">
              <textarea
                value={draft.bio ?? ""}
                onChange={(e) => patch("bio", e.target.value)}
                rows={4}
                placeholder="A short pitch — what you build, what you love, what you're looking for."
                className={inputCls}
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="GitHub URL"><input value={draft.githubUrl ?? ""} onChange={(e) => patch("githubUrl", e.target.value)} className={inputCls} placeholder="https://github.com/…" /></Field>
              <Field label="LinkedIn URL"><input value={draft.linkedinUrl ?? ""} onChange={(e) => patch("linkedinUrl", e.target.value)} className={inputCls} placeholder="https://linkedin.com/in/…" /></Field>
              <Field label="Portfolio URL"><input value={draft.portfolioUrl ?? ""} onChange={(e) => patch("portfolioUrl", e.target.value)} className={inputCls} placeholder="https://…" /></Field>
            </div>

            <Field label="Resume (PDF)">
              <div className="flex items-center gap-3">
                {draft.resumeUrl && <a href={draft.resumeUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">View current</a>}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-2 text-sm hover:border-primary transition-colors">
                  <Upload className="h-4 w-4" /> Upload PDF
                  <input type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && onResumeUpload(e.target.files[0])} />
                </label>
              </div>
            </Field>
          </div>
        )}

        {tab === "skills" && (
          <div className="space-y-6">
            <Field label="Skills">
              <TagInput value={draft.skills ?? []} onChange={(v) => patch("skills", v)} placeholder="e.g. Problem solving, System design" />
            </Field>
            <Field label="Tech Stack">
              <TagInput value={draft.techStack ?? []} onChange={(v) => patch("techStack", v)} placeholder="e.g. React, Postgres, Python" />
            </Field>
          </div>
        )}

        {tab === "projects" && (
          <ListEditor<Project>
            label="Projects"
            items={draft.projects ?? []}
            onChange={(v) => patch("projects", v)}
            empty="No projects yet. Add the ones recruiters should see first."
            create={() => ({ id: uid(), name: "", description: "", techStack: [] })}
            render={(p, update) => (
              <div className="space-y-3">
                <input value={p.name} onChange={(e) => update({ ...p, name: e.target.value })} className={inputCls} placeholder="Project name" />
                <textarea value={p.description} onChange={(e) => update({ ...p, description: e.target.value })} rows={3} className={inputCls} placeholder="What it does, what you built, what's the impact." />
                <TagInput value={p.techStack} onChange={(v) => update({ ...p, techStack: v })} placeholder="React, Node, Postgres" />
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={p.githubUrl ?? ""} onChange={(e) => update({ ...p, githubUrl: e.target.value })} className={inputCls} placeholder="GitHub URL" />
                  <input value={p.liveUrl ?? ""} onChange={(e) => update({ ...p, liveUrl: e.target.value })} className={inputCls} placeholder="Live demo URL" />
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={!!p.featured} onChange={(e) => update({ ...p, featured: e.target.checked })} /> Featured
                </label>
              </div>
            )}
          />
        )}

        {tab === "achievements" && (
          <ListEditor<Achievement>
            label="Achievements"
            items={draft.achievements ?? []}
            onChange={(v) => patch("achievements", v)}
            empty="No achievements yet. Wins, scholarships, recognitions — they all count."
            create={() => ({ id: uid(), title: "", event: "", date: "" })}
            render={(a, update) => (
              <div className="grid gap-3 md:grid-cols-2">
                <input value={a.title} onChange={(e) => update({ ...a, title: e.target.value })} className={inputCls} placeholder="Title" />
                <input value={a.event} onChange={(e) => update({ ...a, event: e.target.value })} className={inputCls} placeholder="Event" />
                <input type="date" value={a.date} onChange={(e) => update({ ...a, date: e.target.value })} className={inputCls} />
                <input value={a.position ?? ""} onChange={(e) => update({ ...a, position: e.target.value })} className={inputCls} placeholder="Position (e.g. 1st)" />
                <textarea value={a.description ?? ""} onChange={(e) => update({ ...a, description: e.target.value })} rows={2} className={`${inputCls} md:col-span-2`} placeholder="Description" />
              </div>
            )}
          />
        )}

        {tab === "certifications" && (
          <ListEditor<Certification>
            label="Certifications"
            items={draft.certifications ?? []}
            onChange={(v) => patch("certifications", v)}
            empty="No certifications yet."
            create={() => ({ id: uid(), name: "", issuer: "", date: "" })}
            render={(c, update) => (
              <div className="grid gap-3 md:grid-cols-2">
                <input value={c.name} onChange={(e) => update({ ...c, name: e.target.value })} className={inputCls} placeholder="Name" />
                <input value={c.issuer} onChange={(e) => update({ ...c, issuer: e.target.value })} className={inputCls} placeholder="Issuer" />
                <input type="date" value={c.date} onChange={(e) => update({ ...c, date: e.target.value })} className={inputCls} />
                <input value={c.credentialUrl ?? ""} onChange={(e) => update({ ...c, credentialUrl: e.target.value })} className={inputCls} placeholder="Credential URL" />
              </div>
            )}
          />
        )}

        {tab === "hackathons" && (
          <ListEditor<HackathonEntry>
            label="Hackathons"
            items={draft.hackathons ?? []}
            onChange={(v) => patch("hackathons", v)}
            empty="No hackathons logged yet."
            create={() => ({ id: uid(), event: "", date: "", result: "participant" })}
            render={(h, update) => (
              <div className="grid gap-3 md:grid-cols-2">
                <input value={h.event} onChange={(e) => update({ ...h, event: e.target.value })} className={inputCls} placeholder="Event" />
                <input type="date" value={h.date} onChange={(e) => update({ ...h, date: e.target.value })} className={inputCls} />
                <input type="number" value={h.teamSize ?? ""} onChange={(e) => update({ ...h, teamSize: Number(e.target.value) })} className={inputCls} placeholder="Team size" />
                <select value={h.result ?? "participant"} onChange={(e) => update({ ...h, result: e.target.value as HackathonEntry["result"] })} className={inputCls}>
                  <option value="participant">Participant</option>
                  <option value="finalist">Finalist</option>
                  <option value="winner">Winner</option>
                </select>
                <input value={h.projectBuilt ?? ""} onChange={(e) => update({ ...h, projectBuilt: e.target.value })} className={`${inputCls} md:col-span-2`} placeholder="Project built" />
                <textarea value={h.description ?? ""} onChange={(e) => update({ ...h, description: e.target.value })} rows={2} className={`${inputCls} md:col-span-2`} placeholder="Description" />
              </div>
            )}
          />
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Need to refresh local state?{" "}
        <button onClick={() => refresh()} className="text-primary hover:underline">Reload from server</button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" }) {
  if (state === "saving") return <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Saving…</span>;
  if (state === "saved") return <span className="inline-flex items-center gap-1.5 text-xs text-accent"><Check className="h-3 w-3" /> Saved</span>;
  return <span className="text-xs text-muted-foreground">Up to date</span>;
}

function ListEditor<T extends { id: string }>({
  label, items, onChange, empty, create, render,
}: {
  label: string;
  items: T[];
  onChange: (next: T[]) => void;
  empty: string;
  create: () => T;
  render: (item: T, update: (next: T) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-display text-lg font-bold">{label}</div>
        <button onClick={() => onChange([...items, create()])} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm hover:border-primary transition-colors">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{empty}</div>
      ) : (
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={it.id} className="rounded-lg border border-border bg-elevated p-4">
              <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono">#{String(idx + 1).padStart(2, "0")}</span>
                <button onClick={() => onChange(items.filter((x) => x.id !== it.id))} className="text-muted-foreground hover:text-accent-warm">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {render(it, (next) => onChange(items.map((x) => (x.id === it.id ? next : x))))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}