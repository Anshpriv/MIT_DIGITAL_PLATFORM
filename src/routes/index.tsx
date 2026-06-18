import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, GitBranch, Trophy, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MIT-WPU Talent Hub — Discover and Be Discovered" },
      { name: "description", content: "AI-powered student profiles, GitHub analytics, and recruiter discovery for MIT-WPU." },
      { property: "og:title", content: "MIT-WPU Talent Hub" },
      { property: "og:description", content: "AI-powered student profiles, GitHub analytics, and recruiter discovery for MIT-WPU." },
    ],
  }),
  component: Index,
});

const features = [
  { icon: Sparkles, title: "AI Portfolio Score", body: "Gemini analyzes your portfolio and tells recruiters why you matter." },
  { icon: GitBranch, title: "GitHub Analytics", body: "Auto-synced repos, languages, streaks — all in one place." },
  { icon: Trophy, title: "Achievement Timeline", body: "Hackathons, certifications, projects — woven into a visual story." },
  { icon: Users, title: "Recruiter Discovery", body: "Top recruiters search MIT-WPU talent by skill, score, and stack." },
];

function Index() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark" />
          <span className="font-display text-lg font-bold tracking-tight">MIT-WPU Talent Hub</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth/login" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
          <Link to="/auth/register" className="btn-gradient rounded-lg px-4 py-2 text-sm font-medium">Get started</Link>
        </div>
      </nav>

      <section className="relative mx-auto max-w-[1280px] px-6 pt-20 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl"
        >
          <div className="tag-mono mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            MIT World Peace University · Pune
          </div>
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            Build a profile <br />
            <span className="bg-gradient-to-r from-primary via-accent to-accent-warm bg-clip-text text-transparent">
              recruiters can&rsquo;t scroll past.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            One link. Every project, every commit, every win — AI-scored, beautifully laid out, and discoverable by India&rsquo;s top recruiters.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/auth/register" className="btn-gradient rounded-lg px-6 py-3 text-base font-medium">
              Create your profile
            </Link>
            <Link to="/auth/login" className="rounded-lg border border-border bg-card px-6 py-3 text-base font-medium hover:border-primary transition-colors">
              I&rsquo;m a recruiter
            </Link>
          </div>
        </motion.div>

        <div
          className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #6C63FF 0%, transparent 70%)" }}
        />
      </section>

      <section className="mx-auto max-w-[1280px] px-6 pb-32">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              className="card-hub p-6"
            >
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} MIT-WPU Talent Hub</span>
          <span className="font-mono text-xs">v0.1 · Phase 1</span>
        </div>
      </footer>
    </main>
  );
}
