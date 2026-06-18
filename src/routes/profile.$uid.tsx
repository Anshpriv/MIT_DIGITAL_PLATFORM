import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { Github, Linkedin, ExternalLink, FileText, Loader2 } from "lucide-react";
import { getDb } from "@/lib/firebase";
import type { Student } from "@/types";

export const Route = createFileRoute("/profile/$uid")({
  ssr: false,
  component: PublicProfile,
});

function PublicProfile() {
  const { uid } = Route.useParams();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(getDb(), "students", uid));
        if (!snap.exists()) { setNotFound(true); return; }
        const data = snap.data() as Student;
        if (!data.isProfilePublic) { setNotFound(true); return; }
        setStudent(data);
      } finally { setLoading(false); }
    })();
  }, [uid]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (notFound || !student) return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold">Profile not available</h1>
        <p className="mt-2 text-sm text-muted-foreground">This profile doesn&rsquo;t exist or is private.</p>
        <Link to="/" className="mt-6 inline-block text-primary hover:underline">Back home</Link>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <header className="card-hub p-8">
          <div className="flex flex-wrap items-start gap-6">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-accent text-3xl font-bold text-white">
              {student.avatar ? <img src={student.avatar} alt="" className="h-full w-full object-cover" /> : student.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-3xl font-bold">{student.name}</h1>
              <div className="mt-1 text-sm text-muted-foreground">
                {student.branch} · Class of {student.graduationYear}
              </div>
              {student.bio && <p className="mt-3 text-sm text-foreground/90">{student.bio}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {student.githubUrl && <SocialLink href={student.githubUrl} icon={Github} label="GitHub" />}
                {student.linkedinUrl && <SocialLink href={student.linkedinUrl} icon={Linkedin} label="LinkedIn" />}
                {student.portfolioUrl && <SocialLink href={student.portfolioUrl} icon={ExternalLink} label="Portfolio" />}
                {student.resumeUrl && <SocialLink href={student.resumeUrl} icon={FileText} label="Resume" />}
              </div>
            </div>
            {student.portfolioScore != null && (
              <div className="rounded-xl border border-border bg-elevated p-4 text-center">
                <div className="font-mono text-xs uppercase text-muted-foreground">Portfolio</div>
                <div className="mt-1 bg-gradient-to-r from-primary to-accent bg-clip-text font-display text-3xl font-bold text-transparent">{student.portfolioScore}</div>
              </div>
            )}
          </div>
        </header>

        {(student.skills?.length || student.techStack?.length) ? (
          <Section title="Skills & Stack">
            {student.skills?.length ? <TagRow tags={student.skills} /> : null}
            {student.techStack?.length ? <TagRow tags={student.techStack} accent /> : null}
          </Section>
        ) : null}

        {student.projects?.length ? (
          <Section title="Projects">
            <div className="grid gap-4 sm:grid-cols-2">
              {student.projects.map((p) => (
                <div key={p.id} className="card-hub p-5">
                  <div className="font-display text-base font-bold">{p.name}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                  {p.techStack?.length ? <div className="mt-3"><TagRow tags={p.techStack} /></div> : null}
                  <div className="mt-3 flex gap-3 text-sm">
                    {p.githubUrl && <a href={p.githubUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">GitHub</a>}
                    {p.liveUrl && <a href={p.liveUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">Live</a>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {student.achievements?.length ? (
          <Section title="Achievements">
            <ul className="space-y-3">
              {student.achievements.map((a) => (
                <li key={a.id} className="card-hub p-4">
                  <div className="font-display text-sm font-bold">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.event} · {a.date}{a.position ? ` · ${a.position}` : ""}</div>
                  {a.description && <p className="mt-2 text-sm text-foreground/90">{a.description}</p>}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {student.certifications?.length ? (
          <Section title="Certifications">
            <ul className="grid gap-3 sm:grid-cols-2">
              {student.certifications.map((c) => (
                <li key={c.id} className="card-hub p-4">
                  <div className="font-display text-sm font-bold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.issuer} · {c.date}</div>
                  {c.credentialUrl && <a href={c.credentialUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-primary hover:underline">View credential</a>}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {student.hackathons?.length ? (
          <Section title="Hackathons">
            <ul className="space-y-3">
              {student.hackathons.map((h) => (
                <li key={h.id} className="card-hub p-4">
                  <div className="font-display text-sm font-bold">{h.event}</div>
                  <div className="text-xs text-muted-foreground">{h.date}{h.result ? ` · ${h.result}` : ""}{h.teamSize ? ` · team of ${h.teamSize}` : ""}</div>
                  {h.projectBuilt && <div className="mt-2 text-sm">Built: <span className="text-foreground/90">{h.projectBuilt}</span></div>}
                  {h.description && <p className="mt-1 text-sm text-foreground/90">{h.description}</p>}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-xl font-bold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function TagRow({ tags, accent = false }: { tags: string[]; accent?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t) => (
        <span key={t} className="tag-mono">
          <span className={`h-1.5 w-1.5 rounded-full ${accent ? "bg-primary" : "bg-accent"}`} />
          {t}
        </span>
      ))}
    </div>
  );
}

function SocialLink({ href, icon: Icon, label }: { href: string; icon: typeof Github; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-elevated px-3 py-1.5 text-xs hover:border-primary transition-colors">
      <Icon className="h-3.5 w-3.5" /> {label}
    </a>
  );
}