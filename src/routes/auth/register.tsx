import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, GraduationCap, Briefcase } from "lucide-react";
import { getFirebaseAuth, getDb, isFirebaseConfigured } from "@/lib/firebase";
import { BRANCHES, type Branch } from "@/types";

export const Route = createFileRoute("/auth/register")({
  head: () => ({ meta: [{ title: "Register · MIT-WPU Talent Hub" }, { name: "description", content: "Create your MIT-WPU Talent Hub account." }] }),
  component: RegisterPage,
});

type Role = "student" | "recruiter";

const baseSchema = z.object({
  name: z.string().min(2, "Required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: "Passwords do not match", path: ["confirm"] });

const studentSchema = z.object({
  branch: z.enum(BRANCHES as [Branch, ...Branch[]]),
  graduationYear: z.coerce.number().int().min(2024).max(2030),
  studentId: z.string().min(3, "Required"),
});

const recruiterSchema = z.object({
  companyName: z.string().min(2, "Required"),
  designation: z.string().min(2, "Required"),
  companyEmail: z.string().email("Enter a valid email"),
});

function RegisterPage() {
  const navigate = useNavigate();
  const configured = isFirebaseConfigured();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const base = useForm({ resolver: zodResolver(baseSchema), mode: "onBlur" });
  const student = useForm({ resolver: zodResolver(studentSchema), mode: "onBlur" });
  const recruiter = useForm({ resolver: zodResolver(recruiterSchema), mode: "onBlur" });

  async function finalize() {
    setError(null);
    setSubmitting(true);
    try {
      const baseV = base.getValues();
      const auth = getFirebaseAuth();
      const cred = await createUserWithEmailAndPassword(auth, baseV.email, baseV.password);
      await updateProfile(cred.user, { displayName: baseV.name });
      const db = getDb();
      const uid = cred.user.uid;

      if (role === "student") {
        const v = student.getValues();
        await setDoc(doc(db, "students", uid), {
          uid,
          email: baseV.email,
          name: baseV.name,
          branch: v.branch,
          graduationYear: v.graduationYear,
          studentId: v.studentId,
          skills: [],
          techStack: [],
          githubConnected: false,
          githubData: null,
          portfolioScore: null,
          portfolioAnalysis: null,
          achievements: [],
          hackathons: [],
          certifications: [],
          projects: [],
          isProfilePublic: true,
          role: "student",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const v = recruiter.getValues();
        await setDoc(doc(db, "recruiters", uid), {
          uid,
          email: baseV.email,
          name: baseV.name,
          companyName: v.companyName,
          designation: v.designation,
          companyEmail: v.companyEmail,
          role: "recruiter",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      navigate({ to: "/dashboard" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  const nextFromBase = async () => {
    const ok = await base.trigger();
    if (ok) setStep(3);
  };

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-8 inline-flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark" />
          <span className="font-display font-bold">MIT-WPU Talent Hub</span>
        </Link>

        <Stepper step={step} />

        {!configured && (
          <div className="mt-6 rounded-lg border border-accent-warm/40 bg-accent-warm/10 p-3 text-xs text-foreground">
            Firebase env vars are missing. Configure <span className="font-mono">.env.local</span> first.
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-border bg-card p-6 md:p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <h2 className="font-display text-2xl font-bold">I am a…</h2>
                <p className="mt-2 text-sm text-muted-foreground">Choose how you&rsquo;ll use Talent Hub.</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <RoleCard active={role === "student"} onClick={() => setRole("student")} icon={<GraduationCap className="h-6 w-6" />} title="Student" desc="Build a profile and get discovered by recruiters." />
                  <RoleCard active={role === "recruiter"} onClick={() => setRole("recruiter")} icon={<Briefcase className="h-6 w-6" />} title="Recruiter" desc="Search MIT-WPU talent by skill and score." />
                </div>
                <div className="mt-8 flex justify-end">
                  <button disabled={!role} onClick={() => setStep(2)} className="btn-gradient rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-40">
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <h2 className="font-display text-2xl font-bold">Your account</h2>
                <p className="mt-2 text-sm text-muted-foreground">Basic details to get you in.</p>
                <div className="mt-6 grid gap-4">
                  <Field label="Full name" error={base.formState.errors.name?.message}>
                    <input {...base.register("name")} className={inputCls} placeholder="Aarav Sharma" />
                  </Field>
                  <Field label="Email" error={base.formState.errors.email?.message}>
                    <input type="email" {...base.register("email")} className={inputCls} placeholder="you@example.com" />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Password" error={base.formState.errors.password?.message}>
                      <input type="password" {...base.register("password")} className={inputCls} placeholder="••••••••" />
                    </Field>
                    <Field label="Confirm password" error={base.formState.errors.confirm?.message as string | undefined}>
                      <input type="password" {...base.register("confirm")} className={inputCls} placeholder="••••••••" />
                    </Field>
                  </div>
                </div>
                <div className="mt-8 flex justify-between">
                  <button onClick={() => setStep(1)} className="rounded-lg border border-border bg-elevated px-4 py-2 text-sm hover:border-primary transition-colors">Back</button>
                  <button onClick={nextFromBase} className="btn-gradient rounded-lg px-5 py-2.5 text-sm font-medium">Continue</button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <h2 className="font-display text-2xl font-bold">
                  {role === "student" ? "Academic info" : "Company info"}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">Just a few more details and you&rsquo;re in.</p>

                {role === "student" ? (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Field label="Branch" error={student.formState.errors.branch?.message}>
                      <select {...student.register("branch")} className={inputCls} defaultValue="">
                        <option value="" disabled>Select branch</option>
                        {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </Field>
                    <Field label="Graduation year" error={student.formState.errors.graduationYear?.message}>
                      <select {...student.register("graduationYear")} className={inputCls} defaultValue="">
                        <option value="" disabled>Select year</option>
                        {[2024, 2025, 2026, 2027, 2028].map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="MIT-WPU Student ID" error={student.formState.errors.studentId?.message}>
                        <input {...student.register("studentId")} className={inputCls} placeholder="e.g. 1032210000" />
                      </Field>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 grid gap-4">
                    <Field label="Company name" error={recruiter.formState.errors.companyName?.message}>
                      <input {...recruiter.register("companyName")} className={inputCls} placeholder="Acme Inc." />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Designation" error={recruiter.formState.errors.designation?.message}>
                        <input {...recruiter.register("designation")} className={inputCls} placeholder="Talent Lead" />
                      </Field>
                      <Field label="Company email" error={recruiter.formState.errors.companyEmail?.message}>
                        <input type="email" {...recruiter.register("companyEmail")} className={inputCls} placeholder="hr@acme.com" />
                      </Field>
                    </div>
                  </div>
                )}

                {error && <p className="mt-4 text-xs text-accent-warm">{error}</p>}

                <div className="mt-8 flex justify-between">
                  <button onClick={() => setStep(2)} className="rounded-lg border border-border bg-elevated px-4 py-2 text-sm hover:border-primary transition-colors">Back</button>
                  <button
                    onClick={async () => {
                      const ok = role === "student" ? await student.trigger() : await recruiter.trigger();
                      if (ok) finalize();
                    }}
                    disabled={submitting || !configured}
                    className="btn-gradient inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create account
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/auth/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-3">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex flex-1 items-center gap-3">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-mono ${
              step >= n ? "border-primary bg-primary text-white" : "border-border text-muted-foreground"
            }`}
          >
            {n}
          </div>
          {n < 3 && <div className={`h-px flex-1 ${step > n ? "bg-primary" : "bg-border"}`} />}
        </div>
      ))}
    </div>
  );
}

function RoleCard({
  active, onClick, icon, title, desc,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border p-5 transition-all ${
        active ? "border-primary bg-primary/5 shadow-[0_8px_32px_rgba(108,99,255,0.16)]" : "border-border bg-elevated hover:border-primary/60"
      }`}
    >
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${active ? "bg-primary text-white" : "bg-card text-muted-foreground"}`}>
        {icon}
      </div>
      <div className="mt-4 font-display text-lg font-bold">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </button>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-elevated px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-accent-warm">{error}</span>}
    </label>
  );
}