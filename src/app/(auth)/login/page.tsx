"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { user, role, signIn, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If user is already logged in, redirect them
  useEffect(() => {
    if (!authLoading && user && role) {
      if (role === "student") {
        router.push("/dashboard");
      } else if (role === "recruiter") {
        router.push("/recruiter/dashboard");
      }
    }
  }, [user, role, authLoading, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    setSubmitting(true);
    try {
      // 1. Search in students collection
      const studentsQuery = query(
        collection(db, "students"),
        where("email", "==", data.email)
      );
      const studentSnap = await getDocs(studentsQuery);

      if (!studentSnap.empty) {
        const studentDoc = studentSnap.docs[0];
        const studentData = studentDoc.data();
        if (studentData.password === data.password) {
          await signIn(studentDoc.id, "student");
          router.push("/dashboard");
          return;
        } else {
          throw new Error("Invalid email or password.");
        }
      }

      // 2. Search in recruiters collection
      const recruitersQuery = query(
        collection(db, "recruiters"),
        where("email", "==", data.email)
      );
      const recruiterSnap = await getDocs(recruitersQuery);

      if (!recruiterSnap.empty) {
        const recruiterDoc = recruiterSnap.docs[0];
        const recruiterData = recruiterDoc.data();
        if (recruiterData.password === data.password) {
          await signIn(recruiterDoc.id, "recruiter");
          router.push("/recruiter/dashboard");
          return;
        } else {
          throw new Error("Invalid email or password.");
        }
      }

      // If not found in either
      throw new Error("No account found with this email.");
    } catch (e: any) {
      setError(e.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const { signInWithPopup } = await import("firebase/auth");
      const { googleProvider } = await import("@/lib/firebase-providers");
      if (!auth) {
        throw new Error("Google auth is currently disabled or unconfigured.");
      }
      const cred = await signInWithPopup(auth, googleProvider);
      const email = cred.user.email;
      if (!email) throw new Error("No email returned from Google.");

      // Check if student exists
      const sQuery = query(collection(db, "students"), where("email", "==", email));
      const sSnap = await getDocs(sQuery);
      if (!sSnap.empty) {
        await signIn(sSnap.docs[0].id, "student");
        router.push("/dashboard");
        return;
      }

      // Check if recruiter exists
      const rQuery = query(collection(db, "recruiters"), where("email", "==", email));
      const rSnap = await getDocs(rQuery);
      if (!rSnap.empty) {
        await signIn(rSnap.docs[0].id, "recruiter");
        router.push("/recruiter/dashboard");
        return;
      }

      // Auto-create student account if it doesn't exist
      const uid = cred.user.uid;
      const { setDoc, doc } = await import("firebase/firestore");
      await setDoc(doc(db, "students", uid), {
        uid,
        email,
        name: cred.user.displayName || "Google User",
        password: "google_authenticated_user",
        branch: "Other",
        graduationYear: 2026,
        studentId: "G-" + uid.substring(0, 6),
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
      await signIn(uid, "student");
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message || "Google sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-bg-base md:grid-cols-2 text-text-primary">
      {/* Left panel: tagline & animated gradient */}
      <div className="relative hidden overflow-hidden md:flex flex-col justify-between p-12 border-r border-border bg-bg-surface">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 20% 30%, rgba(108,99,255,0.15), transparent 50%), radial-gradient(circle at 80% 70%, rgba(0,212,170,0.1), transparent 50%), #0A0A0F",
          }}
        />
        <div className="relative z-10 flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary-dark shadow-[0_0_15px_rgba(108,99,255,0.5)]" />
          <span className="font-display font-bold text-xl tracking-tight">MIT-WPU Talent Hub</span>
        </div>
        <div className="relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="font-display text-5xl font-bold leading-tight tracking-tight text-text-primary"
          >
            One link. <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Every milestone.</span> <br />
            Every recruiter.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-6 max-w-md text-text-secondary text-base leading-relaxed"
          >
            A full-stack, AI-powered profile and analytics platform designed specifically for students and partners of MIT World Peace University, Pune.
          </motion.p>
        </div>
        <div className="relative z-10 font-mono text-xs text-text-disabled">
          v1.0 · MIT World Peace University
        </div>
      </div>

      {/* Right panel: Form */}
      <div className="flex items-center justify-center px-6 py-12 md:px-12 bg-bg-base">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <h1 className="font-display text-4xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-text-secondary">Sign in to your MIT-WPU Talent Hub account.</p>

          <button
            onClick={handleGoogleSignIn}
            disabled={submitting}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-button border border-border bg-bg-surface px-4 py-3 text-sm font-medium hover:border-primary hover:shadow-[0_0_15px_rgba(108,99,255,0.1)] transition-all duration-200 disabled:opacity-50"
          >
            <GoogleIcon /> Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-text-disabled">
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono uppercase tracking-wider text-[10px]">or email credentials</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Email Address
              </span>
              <input
                type="email"
                {...register("email")}
                className="w-full rounded-input border border-border bg-bg-surface px-3.5 py-3 text-sm text-text-primary placeholder:text-text-disabled focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                placeholder="you@mitwpu.edu.in"
              />
              {errors.email?.message && (
                <span className="mt-1.5 block text-xs text-accent-warm font-mono">{errors.email.message}</span>
              )}
            </div>

            <div className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Password
              </span>
              <input
                type="password"
                {...register("password")}
                className="w-full rounded-input border border-border bg-bg-surface px-3.5 py-3 text-sm text-text-primary placeholder:text-text-disabled focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                placeholder="••••••••"
              />
              {errors.password?.message && (
                <span className="mt-1.5 block text-xs text-accent-warm font-mono">{errors.password.message}</span>
              )}
            </div>

            {error && (
              <div className="rounded-input border border-accent-warm/40 bg-accent-warm/10 p-3 text-xs text-accent-warm leading-relaxed font-mono">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="relative w-full overflow-hidden rounded-button bg-gradient-to-r from-primary to-primary-dark px-4 py-3 text-sm font-semibold text-white hover:brightness-110 active:brightness-95 transition-all duration-200 disabled:opacity-50 shadow-[0_4px_24px_rgba(108,99,255,0.2)] hover:shadow-[0_4px_32px_rgba(108,99,255,0.35)]"
            >
              <span className="flex items-center justify-center gap-2">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign In
              </span>
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-text-secondary">
            Don&rsquo;t have an account?
            <div className="mt-2 flex items-center justify-center gap-4">
              <Link href="/register?role=student" className="text-primary hover:underline font-semibold transition-colors duration-200">
                Register as Student
              </Link>
              <span className="text-text-disabled font-mono">|</span>
              <Link href="/register?role=recruiter" className="text-accent hover:underline font-semibold transition-colors duration-200">
                Register as Recruiter
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="mr-1">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
