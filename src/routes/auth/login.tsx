import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { getFirebaseAuth, getDb, googleProvider, isFirebaseConfigured } from "@/lib/firebase";

export const Route = createFileRoute("/auth/login")({
  head: () => ({ meta: [{ title: "Sign in · MIT-WPU Talent Hub" }, { name: "description", content: "Sign in to your MIT-WPU Talent Hub account." }] }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});
type FormData = z.infer<typeof schema>;

function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const configured = isFirebaseConfigured();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function routeByRole(uid: string) {
    const db = getDb();
    const s = await getDoc(doc(db, "students", uid));
    if (s.exists()) return navigate({ to: "/dashboard" });
    const r = await getDoc(doc(db, "recruiters", uid));
    if (r.exists()) return navigate({ to: "/dashboard" }); // recruiter dashboard in Phase 2
    navigate({ to: "/dashboard" });
  }

  const onSubmit = async (data: FormData) => {
    setError(null);
    setSubmitting(true);
    try {
      const cred = await signInWithEmailAndPassword(getFirebaseAuth(), data.email, data.password);
      await routeByRole(cred.user.uid);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const cred = await signInWithPopup(getFirebaseAuth(), googleProvider);
      await routeByRole(cred.user.uid);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign in failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-background md:grid-cols-2">
      <div className="relative hidden overflow-hidden md:block">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, rgba(108,99,255,0.4), transparent 50%), radial-gradient(circle at 70% 80%, rgba(0,212,170,0.25), transparent 50%), #0A0A0F",
          }}
        />
        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark" />
            <span className="font-display font-bold">MIT-WPU Talent Hub</span>
          </Link>
          <div>
            <h2 className="font-display text-4xl font-bold leading-tight">
              One link. <br />Every milestone. <br />Every recruiter.
            </h2>
            <p className="mt-4 max-w-sm text-muted-foreground">
              Sign in to keep building the profile that does the talking for you.
            </p>
          </div>
          <div className="font-mono text-xs text-muted-foreground">v0.1 · MIT World Peace University</div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl font-bold">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to your Talent Hub account.</p>

          {!configured && (
            <div className="mt-6 rounded-lg border border-accent-warm/40 bg-accent-warm/10 p-3 text-xs text-foreground">
              Firebase env vars are missing. Configure them in <span className="font-mono">.env.local</span> first.
            </div>
          )}

          <button
            onClick={onGoogle}
            disabled={submitting || !configured}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:border-primary transition-colors disabled:opacity-50"
          >
            <GoogleIcon /> Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono uppercase">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Email" error={errors.email?.message}>
              <input type="email" {...register("email")} className={inputCls} placeholder="you@mitwpu.edu.in" />
            </Field>
            <Field label="Password" error={errors.password?.message}>
              <input type="password" {...register("password")} className={inputCls} placeholder="••••••••" />
            </Field>

            {error && <p className="text-xs text-accent-warm">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !configured}
              className="btn-gradient flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&rsquo;t have an account?{" "}
            <Link to="/auth/register" className="text-primary hover:underline">Register</Link>
          </p>
        </div>
      </div>
    </div>
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

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
  );
}