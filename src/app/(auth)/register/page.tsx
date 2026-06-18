"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, Suspense, useEffect } from "react";
import { doc, setDoc, query, collection, where, getDocs } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, GraduationCap, Briefcase } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { BRANCHES, type Branch } from "@/types";

type Role = "student" | "recruiter";

const baseSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

const studentSchema = z.object({
  branch: z.enum(BRANCHES as [Branch, ...Branch[]], {
    errorMap: () => ({ message: "Select a valid academic branch" }),
  }),
  graduationYear: z.coerce
    .number()
    .int()
    .min(2024, "Invalid year")
    .max(2028, "Invalid year"),
  studentId: z.string().min(3, "Student ID is required"),
});

const recruiterSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  designation: z.string().min(2, "Designation is required"),
  companyEmail: z.string().email("Enter a valid company email"),
});

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-base text-text-primary flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    }>
      <RegisterFormContent />
    </Suspense>
  );
}

function RegisterFormContent() {
  const router = useRouter();
  const { signIn } = useAuth();
  const searchParams = useSearchParams();
  const urlRole = searchParams.get("role") as Role;

  const isRoleLocked = urlRole === "student" || urlRole === "recruiter";

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isRoleLocked) {
      setRole(urlRole);
      setStep(2);
    }
  }, [urlRole, isRoleLocked]);

  const baseForm = useForm({
    resolver: zodResolver(baseSchema),
    mode: "onBlur",
  });
  const studentForm = useForm({
    resolver: zodResolver(studentSchema),
    mode: "onBlur",
  });
  const recruiterForm = useForm({
    resolver: zodResolver(recruiterSchema),
    mode: "onBlur",
  });

  const nextFromBase = async () => {
    const ok = await baseForm.trigger();
    if (ok) {
      setStep(3);
    }
  };

  async function handleRegister() {
    setError(null);
    setSubmitting(true);
    try {
      const baseValues = baseForm.getValues();

      // 1. Check if email already exists in students or recruiters
      const sQuery = query(collection(db, "students"), where("email", "==", baseValues.email));
      const rQuery = query(collection(db, "recruiters"), where("email", "==", baseValues.email));
      const [sSnap, rSnap] = await Promise.all([getDocs(sQuery), getDocs(rQuery)]);

      if (!sSnap.empty || !rSnap.empty) {
        throw new Error("An account with this email already exists.");
      }

      // 2. Generate a custom unique ID for database document key
      const uid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      // 3. Save details directly to Firestore
      if (role === "student") {
        const studentValues = studentForm.getValues();
        await setDoc(doc(db, "students", uid), {
          uid,
          email: baseValues.email,
          password: baseValues.password, // Stored directly in Firestore
          name: baseValues.name,
          branch: studentValues.branch,
          graduationYear: studentValues.graduationYear,
          studentId: studentValues.studentId,
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        const recruiterValues = recruiterForm.getValues();
        await setDoc(doc(db, "recruiters", uid), {
          uid,
          email: baseValues.email,
          password: baseValues.password, // Stored directly in Firestore
          name: baseValues.name,
          companyName: recruiterValues.companyName,
          designation: recruiterValues.designation,
          companyEmail: recruiterValues.companyEmail,
          role: "recruiter",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // 4. Log session in Auth Context
      await signIn(uid, role);

      // 5. Redirect to role dashboard
      router.push(role === "student" ? "/dashboard" : "/recruiter/dashboard");
    } catch (e: any) {
      setError(e.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-primary px-6 py-12 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <Link href="/" className="mb-8 inline-flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark shadow-[0_0_10px_rgba(108,99,255,0.4)]" />
          <span className="font-display font-bold text-xl">MIT-WPU Talent Hub</span>
        </Link>

        {/* Stepper Progress Indicator */}
        <Stepper step={step} />

        <div className="mt-8 rounded-card border border-border bg-bg-surface p-6 md:p-8 shadow-[0_4px_24px_rgba(108,99,255,0.05)]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="font-display text-2xl font-bold">Choose your role</h2>
                <p className="mt-2 text-sm text-text-secondary">
                  Choose how you&rsquo;ll use the Talent Hub.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <RoleCard
                    active={role === "student"}
                    onClick={() => setRole("student")}
                    icon={<GraduationCap className="h-6 w-6" />}
                    title="Student"
                    desc="Build a digital profile, sync GitHub, and get discovered by recruiters."
                  />
                  <RoleCard
                    active={role === "recruiter"}
                    onClick={() => setRole("recruiter")}
                    icon={<Briefcase className="h-6 w-6" />}
                    title="Recruiter"
                    desc="Search verified talent at MIT World Peace University by skill and score."
                  />
                </div>
                <div className="mt-8 flex justify-end">
                  <button
                    disabled={!role}
                    onClick={() => setStep(2)}
                    className="bg-gradient-to-r from-primary to-primary-dark hover:brightness-110 active:scale-[0.98] rounded-button px-5 py-2.5 text-sm font-semibold transition-all duration-200 disabled:opacity-40"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="font-display text-2xl font-bold">Account details</h2>
                <p className="mt-2 text-sm text-text-secondary">Enter your basic email credentials.</p>
                <div className="mt-6 grid gap-4">
                  <div className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Full Name
                    </span>
                    <input
                      {...baseForm.register("name")}
                      className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      placeholder="Aarav Sharma"
                    />
                    {baseForm.formState.errors.name?.message && (
                      <span className="mt-1.5 block text-xs text-accent-warm font-mono">
                        {String(baseForm.formState.errors.name.message)}
                      </span>
                    )}
                  </div>

                  <div className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Email Address
                    </span>
                    <input
                      type="email"
                      {...baseForm.register("email")}
                      className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      placeholder="aarav@mitwpu.edu.in"
                    />
                    {baseForm.formState.errors.email?.message && (
                      <span className="mt-1.5 block text-xs text-accent-warm font-mono">
                        {String(baseForm.formState.errors.email.message)}
                      </span>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="block">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Password
                      </span>
                      <input
                        type="password"
                        {...baseForm.register("password")}
                        className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                        placeholder="••••••••"
                      />
                      {baseForm.formState.errors.password?.message && (
                        <span className="mt-1.5 block text-xs text-accent-warm font-mono">
                          {String(baseForm.formState.errors.password.message)}
                        </span>
                      )}
                    </div>

                    <div className="block">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Confirm Password
                      </span>
                      <input
                        type="password"
                        {...baseForm.register("confirm")}
                        className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                        placeholder="••••••••"
                      />
                      {baseForm.formState.errors.confirm?.message && (
                        <span className="mt-1.5 block text-xs text-accent-warm font-mono">
                          {String(baseForm.formState.errors.confirm.message)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  <button
                    onClick={() => {
                      if (isRoleLocked) {
                        router.push("/login");
                      } else {
                        setStep(1);
                      }
                    }}
                    className="rounded-button border border-border bg-bg-elevated px-4 py-2.5 text-sm font-semibold hover:border-primary transition-colors duration-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={nextFromBase}
                    className="bg-gradient-to-r from-primary to-primary-dark hover:brightness-110 active:scale-[0.98] rounded-button px-5 py-2.5 text-sm font-semibold transition-all duration-200"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="font-display text-2xl font-bold">
                  {role === "student" ? "Academic profile" : "Company registration"}
                </h2>
                <p className="mt-2 text-sm text-text-secondary">
                  Configure details for your {role} access.
                </p>

                {role === "student" ? (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="block">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Branch
                      </span>
                      <select
                        {...studentForm.register("branch")}
                        className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Select branch
                        </option>
                        {BRANCHES.map((b) => (
                          <option key={b} value={b} className="bg-bg-surface text-text-primary">
                            {b}
                          </option>
                        ))}
                      </select>
                      {studentForm.formState.errors.branch?.message && (
                        <span className="mt-1.5 block text-xs text-accent-warm font-mono">
                          {String(studentForm.formState.errors.branch.message)}
                        </span>
                      )}
                    </div>

                    <div className="block">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Graduation Year
                      </span>
                      <select
                        {...studentForm.register("graduationYear")}
                        className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Select year
                        </option>
                        {[2024, 2025, 2026, 2027, 2028].map((y) => (
                          <option key={y} value={y} className="bg-bg-surface text-text-primary">
                            {y}
                          </option>
                        ))}
                      </select>
                      {studentForm.formState.errors.graduationYear?.message && (
                        <span className="mt-1.5 block text-xs text-accent-warm font-mono">
                          {String(studentForm.formState.errors.graduationYear.message)}
                        </span>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <div className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                          MIT-WPU Student ID
                        </span>
                        <input
                          {...studentForm.register("studentId")}
                          className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                          placeholder="e.g. 1032210000"
                        />
                        {studentForm.formState.errors.studentId?.message && (
                          <span className="mt-1.5 block text-xs text-accent-warm font-mono">
                            {String(studentForm.formState.errors.studentId.message)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 grid gap-4">
                    <div className="block">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Company Name
                      </span>
                      <input
                        {...recruiterForm.register("companyName")}
                        className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                        placeholder="e.g. Google India"
                      />
                      {recruiterForm.formState.errors.companyName?.message && (
                        <span className="mt-1.5 block text-xs text-accent-warm font-mono">
                          {String(recruiterForm.formState.errors.companyName.message)}
                        </span>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                          Designation
                        </span>
                        <input
                          {...recruiterForm.register("designation")}
                          className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                          placeholder="e.g. Talent Acquisition"
                        />
                        {recruiterForm.formState.errors.designation?.message && (
                          <span className="mt-1.5 block text-xs text-accent-warm font-mono">
                            {String(recruiterForm.formState.errors.designation.message)}
                          </span>
                        )}
                      </div>

                      <div className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                          Company Email Address
                        </span>
                        <input
                          type="email"
                          {...recruiterForm.register("companyEmail")}
                          className="w-full rounded-input border border-border bg-bg-base px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                          placeholder="you@company.com"
                        />
                        {recruiterForm.formState.errors.companyEmail?.message && (
                          <span className="mt-1.5 block text-xs text-accent-warm font-mono">
                            {String(recruiterForm.formState.errors.companyEmail.message)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mt-5 rounded-input border border-accent-warm/40 bg-accent-warm/10 p-3 text-xs text-accent-warm leading-relaxed font-mono">
                    {error}
                  </div>
                )}

                <div className="mt-8 flex justify-between">
                  <button
                    onClick={() => setStep(2)}
                    className="rounded-button border border-border bg-bg-elevated px-4 py-2.5 text-sm font-semibold hover:border-primary transition-colors duration-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={async () => {
                      const ok =
                        role === "student"
                          ? await studentForm.trigger()
                          : await recruiterForm.trigger();
                      if (ok) {
                        await handleRegister();
                      }
                    }}
                    disabled={submitting}
                    className="relative bg-gradient-to-r from-primary to-primary-dark hover:brightness-110 active:scale-[0.98] rounded-button px-5 py-2.5 text-sm font-semibold transition-all duration-200 disabled:opacity-50 shadow-[0_4px_24px_rgba(108,99,255,0.2)]"
                  >
                    <span className="flex items-center gap-2">
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      Create Account
                    </span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline font-semibold transition-colors duration-200">
            Sign in
          </Link>
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
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-mono font-bold transition-all duration-300 ${
              step >= n
                ? "border-primary bg-primary text-white shadow-[0_0_8px_rgba(108,99,255,0.5)]"
                : "border-border text-text-disabled"
            }`}
          >
            {n}
          </div>
          {n < 3 && (
            <div className="h-px flex-1 bg-border">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: step > n ? "100%" : "0%" }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RoleCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-card border p-5 transition-all duration-200 ${
        active
          ? "border-primary bg-primary/5 shadow-[0_8px_32px_rgba(108,99,255,0.12)]"
          : "border-border bg-bg-surface hover:border-primary/50"
      }`}
    >
      <div
        className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200 ${
          active ? "bg-primary text-white" : "bg-bg-base text-text-secondary"
        }`}
      >
        {icon}
      </div>
      <div className="mt-4 font-display text-lg font-bold text-text-primary">{title}</div>
      <p className="mt-1 text-sm text-text-secondary leading-relaxed">{desc}</p>
    </button>
  );
}
