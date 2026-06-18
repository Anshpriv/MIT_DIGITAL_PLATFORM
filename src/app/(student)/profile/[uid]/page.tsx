"use client";

import { use, useEffect, useState } from "react";
import { doc, getDoc, setDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import type { Student } from "@/types";
import {
  Github,
  Linkedin,
  Globe,
  FileDown,
  Mail,
  Loader2,
  Calendar,
  Award,
  ChevronRight,
  FolderGit2,
  Star,
  Trophy,
  Briefcase,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import GitHubStats from "@/components/github/GitHubStats";

interface Props {
  params: Promise<{ uid: string }>;
}

export default function PublicProfilePage({ params }: Props) {
  const { uid } = use(params);
  const { user, role } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch student profile
  useEffect(() => {
    if (!uid) return;
    const fetchStudent = async () => {
      try {
        const snap = await getDoc(doc(db, "students", uid));
        if (snap.exists()) {
          setStudent(snap.data() as Student);
        }
      } catch (err) {
        console.error("Error loading student profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [uid]);

  // Log profile view telemetry
  useEffect(() => {
    if (!uid) return;
    const logView = async () => {
      try {
        // Generate simple unique view ID
        const viewId = Math.random().toString(36).substring(2, 15);
        const sessionKey = `view_sess_${uid}`;
        
        let sessionId = sessionStorage.getItem(sessionKey);
        if (!sessionId) {
          sessionId = Math.random().toString(36).substring(2, 15);
          sessionStorage.setItem(sessionKey, sessionId);
        }

        const viewRef = doc(db, "students", uid, "profileViews", viewId);
        await setDoc(viewRef, {
          timestamp: new Date().toISOString(),
          viewerUid: user ? user.uid : null,
          isRecruiter: role === "recruiter",
          sessionId,
        });
      } catch (err) {
        console.error("Failed to log profile view telemetry", err);
      }
    };
    logView();
  }, [uid, user, role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center gap-3 text-text-primary">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-text-secondary font-mono text-sm">Loading profile...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-8 text-text-primary">
        <h2 className="font-display text-2xl font-bold">Profile Not Found</h2>
        <p className="text-sm text-text-secondary mt-2">
          The requested profile does not exist or may have been set to private.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 border border-border rounded-button px-4 py-2 hover:border-primary transition-colors text-sm font-semibold"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-primary pb-20">
      {/* Header Block with Glow */}
      <div className="relative border-b border-border bg-bg-surface overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/5 pointer-events-none" />
        <div className="max-w-[1200px] mx-auto px-6 py-12 relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            {/* Avatar */}
            <div className="h-24 w-24 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-primary font-bold overflow-hidden shadow-lg shrink-0">
              {student.avatar ? (
                <img src={student.avatar} alt={student.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl">{student.name?.charAt(0) || "S"}</span>
              )}
            </div>

            <div className="space-y-1">
              <h1 className="font-display text-3xl font-extrabold tracking-tight">{student.name}</h1>
              <p className="text-text-secondary text-sm font-semibold">
                {student.branch} &middot; Graduation Year {student.graduationYear}
              </p>
              <div className="flex flex-wrap gap-4 pt-3 text-text-secondary">
                {student.githubUrl && (
                  <a href={student.githubUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    <Github className="h-5 w-5" />
                  </a>
                )}
                {student.linkedinUrl && (
                  <a href={student.linkedinUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    <Linkedin className="h-5 w-5" />
                  </a>
                )}
                {student.portfolioUrl && (
                  <a href={student.portfolioUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    <Globe className="h-5 w-5" />
                  </a>
                )}
                <a href={`mailto:${student.email}`} className="hover:text-primary transition-colors">
                  <Mail className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>

          {student.resumeUrl && (
            <a
              href={student.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-button bg-primary hover:bg-primary-dark transition-all duration-200 px-5 py-3 text-sm font-bold text-white shadow-[0_4px_20px_rgba(108,99,255,0.25)] shrink-0"
            >
              <FileDown className="h-4 w-4" /> Download Resume
            </a>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-[1200px] mx-auto px-6 mt-12 grid gap-8 md:grid-cols-3">
        {/* Left Side: About, Skills, Certs, Hackathons */}
        <div className="space-y-8">
          {/* About */}
          {student.bio && (
            <div className="rounded-card border border-border bg-bg-surface p-6">
              <h3 className="font-display text-lg font-bold mb-4">About</h3>
              <div
                className="text-sm text-text-secondary leading-relaxed space-y-3 prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: student.bio }}
              />
            </div>
          )}

          {/* Skills */}
          {student.skills && student.skills.length > 0 && (
            <div className="rounded-card border border-border bg-bg-surface p-6">
              <h3 className="font-display text-lg font-bold mb-4">Skills & Technologies</h3>
              <div className="flex flex-wrap gap-2">
                {student.skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs font-mono px-2.5 py-1 rounded bg-bg-base border border-border text-text-secondary"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {student.certifications && student.certifications.length > 0 && (
            <div className="rounded-card border border-border bg-bg-surface p-6 space-y-4">
              <h3 className="font-display text-lg font-bold">Certifications</h3>
              <div className="space-y-4">
                {student.certifications.map((cert) => (
                  <div key={cert.id} className="flex gap-3 items-start">
                    <div className="h-8 w-8 rounded bg-bg-base border border-border flex items-center justify-center text-text-disabled overflow-hidden shrink-0">
                      {cert.logoUrl ? (
                        <img src={cert.logoUrl} alt={cert.issuer} className="h-full w-full object-cover" />
                      ) : (
                        <Award className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold leading-tight">{cert.name}</h4>
                      <p className="text-xs text-text-secondary mt-0.5">{cert.issuer}</p>
                      <p className="text-[10px] text-text-disabled mt-1 font-mono">{cert.date}</p>
                      {cert.credentialUrl && (
                        <a
                          href={cert.credentialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline mt-1 font-semibold"
                        >
                          Verify credentials <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hackathons */}
          {student.hackathons && student.hackathons.length > 0 && (
            <div className="rounded-card border border-border bg-bg-surface p-6 space-y-4">
              <h3 className="font-display text-lg font-bold">Hackathons</h3>
              <div className="space-y-4">
                {student.hackathons.map((h) => (
                  <div key={h.id} className="border-l border-border pl-4 relative space-y-1">
                    <div className="absolute left-[-5px] top-1.5 h-2 w-2 rounded-full bg-accent" />
                    <h4 className="text-sm font-bold">{h.event}</h4>
                    <p className="text-xs text-text-secondary">Project Built: {h.projectBuilt || "N/A"}</p>
                    <div className="flex gap-2 items-center mt-1">
                      <span className="text-[9px] font-mono uppercase bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded text-accent font-semibold">
                        {h.result || "participant"}
                      </span>
                      <span className="text-[10px] text-text-disabled font-mono">{h.date}</span>
                    </div>
                    {h.description && (
                      <p className="text-xs text-text-secondary leading-relaxed mt-2 pt-1 border-t border-border/40">
                        {h.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: GitHub Stats, Projects, Achievements Timeline */}
        <div className="md:col-span-2 space-y-8">
          {/* GitHub Stats */}
          {student.githubConnected && student.githubData && (
            <GitHubStats stats={student.githubData} />
          )}

          {/* Projects */}
          {student.projects && student.projects.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-display text-lg font-bold">Featured Projects</h3>
              <div className="grid gap-6 sm:grid-cols-2">
                {student.projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="rounded-card border border-border bg-bg-surface p-5 flex flex-col justify-between hover:border-primary/30 transition-colors"
                  >
                    <div>
                      {proj.thumbnailUrl && (
                        <div className="aspect-video w-full rounded-lg bg-bg-base border border-border mb-4 overflow-hidden relative">
                          <img src={proj.thumbnailUrl} alt={proj.name} className="h-full w-full object-cover" />
                        </div>
                      )}
                      <h4 className="text-base font-bold flex items-center justify-between gap-2">
                        {proj.name}
                        {proj.featured && (
                          <span className="text-[9px] font-mono bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded font-semibold uppercase">
                            Featured
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                        {proj.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-border flex items-center justify-between gap-4">
                      {/* Tech badges */}
                      <div className="flex flex-wrap gap-1">
                        {proj.techStack?.slice(0, 3).map((tech) => (
                          <span key={tech} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-base text-text-secondary border border-border">
                            {tech}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-3 text-text-secondary">
                        {proj.githubUrl && (
                          <a href={proj.githubUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                            <Github className="h-4.5 w-4.5" />
                          </a>
                        )}
                        {proj.liveUrl && (
                          <a href={proj.liveUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                            <ExternalLink className="h-4.5 w-4.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Achievements */}
          {student.achievements && student.achievements.length > 0 && (
            <div className="rounded-card border border-border bg-bg-surface p-6 space-y-6">
              <h3 className="font-display text-lg font-bold">Timeline & Achievements</h3>
              <div className="relative border-l border-border pl-6 ml-2 space-y-6">
                {student.achievements.map((ach) => (
                  <div key={ach.id} className="relative">
                    <div className="absolute left-[-31px] top-1 h-3 w-3 rounded-full bg-accent-warm border-2 border-bg-surface" />
                    <div>
                      <h4 className="text-sm font-bold flex flex-wrap items-baseline gap-x-2">
                        {ach.title}
                        {ach.position && (
                          <span className="text-[10px] text-accent-warm font-semibold font-mono">
                            {ach.position}
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-text-secondary mt-0.5">{ach.event}</p>
                      <p className="text-[10px] text-text-disabled font-mono mt-0.5">{ach.date}</p>
                      {ach.description && (
                        <p className="text-xs text-text-secondary mt-2 leading-relaxed bg-bg-base/30 border border-border/40 p-2.5 rounded-lg">
                          {ach.description}
                        </p>
                      )}
                      {ach.certificateUrl && (
                        <a
                          href={ach.certificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-2 font-semibold"
                        >
                          View certificate <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
