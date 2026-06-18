import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import type { TimelineEvent, Student } from "@/types";

/**
 * Parses various date formats (ISO string, "March 2026", etc.) into a comparable Date object.
 */
export function parseEventDate(dateStr: string | undefined): Date {
  if (!dateStr) return new Date();

  // Try parsing directly (works for ISO strings and standard date formats)
  const parsed = Date.parse(dateStr);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }

  // Handle formats like "March 2026", "Jan 2025"
  const monthYearRegex = /^([a-zA-Z]+)\s+(\d{4})$/;
  const match = dateStr.match(monthYearRegex);
  if (match) {
    const months: Record<string, number> = {
      jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
      may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8,
      oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
    };
    const month = months[match[1].toLowerCase()];
    const year = parseInt(match[2], 10);
    if (month !== undefined) {
      return new Date(year, month, 1);
    }
  }

  return new Date();
}

/**
 * Compiles and returns a chronologically sorted list of timeline events for a student.
 */
export async function generateTimeline(studentUid: string): Promise<TimelineEvent[]> {
  let studentData: Student | null = null;

  // Support both server-side (Admin SDK) and client-side environments
  if (typeof window === "undefined") {
    try {
      const { adminDb } = await import("./firebase-admin");
      if (adminDb) {
        const docSnap = await adminDb.collection("students").doc(studentUid).get();
        if (docSnap.exists) {
          studentData = docSnap.data() as Student;
        }
      }
    } catch (e) {
      console.warn("Server-side firebase-admin import not available, using client SDK fallback", e);
    }
  }

  if (!studentData) {
    const docSnap = await getDoc(doc(db, "students", studentUid));
    if (docSnap.exists()) {
      studentData = docSnap.data() as Student;
    }
  }

  if (!studentData) {
    return [];
  }

  const events: TimelineEvent[] = [];

  // 1. Profile Creation Milestone
  if (studentData.createdAt) {
    events.push({
      id: "joined-talent-hub",
      type: "profile_milestone",
      date: studentData.createdAt,
      title: "Joined Talent Hub",
      description: "Created their student profile on MIT-WPU Talent Hub.",
      icon: "UserPlus",
      color: "primary",
    });
  }

  // 2. Hackathons
  if (studentData.hackathons && studentData.hackathons.length > 0) {
    studentData.hackathons.forEach((hack) => {
      const isWinner = hack.result === "winner" || hack.result === "finalist";
      events.push({
        id: `hack-${hack.id}`,
        type: isWinner ? "hackathon_win" : "achievement",
        date: hack.date,
        title: `${hack.event} (${hack.result ? hack.result.toUpperCase() : "Participant"})`,
        description: hack.description || `Built project: ${hack.projectBuilt || "N/A"}. Team size: ${hack.teamSize || 1}.`,
        icon: "Trophy",
        color: isWinner ? "accent-warm" : "primary",
        metadata: {
          projectBuilt: hack.projectBuilt,
          teamSize: hack.teamSize,
          result: hack.result,
        },
      });
    });
  }

  // 3. Achievements
  if (studentData.achievements && studentData.achievements.length > 0) {
    studentData.achievements.forEach((ach) => {
      events.push({
        id: `ach-${ach.id}`,
        type: "achievement",
        date: ach.date,
        title: ach.title,
        description: ach.description || `Honored at ${ach.event}${ach.position ? ` as ${ach.position}` : ""}.`,
        icon: "Award",
        color: "primary",
        metadata: {
          event: ach.event,
          position: ach.position,
        },
      });
    });
  }

  // 4. Certifications
  if (studentData.certifications && studentData.certifications.length > 0) {
    studentData.certifications.forEach((cert) => {
      events.push({
        id: `cert-${cert.id}`,
        type: "certification",
        date: cert.date,
        title: cert.name,
        description: `Issued by ${cert.issuer}.`,
        icon: "ShieldCheck",
        color: "accent",
        metadata: {
          issuer: cert.issuer,
          credentialUrl: cert.credentialUrl,
        },
      });
    });
  }

  // 5. Projects
  if (studentData.projects && studentData.projects.length > 0) {
    studentData.projects.forEach((proj) => {
      events.push({
        id: `proj-${proj.id}`,
        type: "project",
        date: studentData?.createdAt || new Date().toISOString(), // Fallback to profile creation
        title: proj.name,
        description: proj.description,
        icon: "Briefcase",
        color: "primary",
        metadata: {
          techStack: proj.techStack,
          liveUrl: proj.liveUrl,
          githubUrl: proj.githubUrl,
        },
      });
    });
  }

  // 6. GitHub Repositories (sorted by updatedAt/pushedAt desc, limit to top 15 to avoid bloating timeline)
  if (studentData.githubData?.repos && studentData.githubData.repos.length > 0) {
    const sortedRepos = [...studentData.githubData.repos]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 15);

    sortedRepos.forEach((repo) => {
      events.push({
        id: `repo-${repo.name}`,
        type: "github_repo",
        date: repo.updatedAt,
        title: `Repo: ${repo.name}`,
        description: repo.description || `GitHub Repository in ${repo.language || "unspecified language"}.`,
        icon: "Github",
        color: "text-secondary",
        metadata: {
          language: repo.language,
          stars: repo.stars,
          forks: repo.forks,
        },
      });
    });
  }

  // Sort timeline chronologically (latest events first)
  return events.sort((a, b) => parseEventDate(b.date).getTime() - parseEventDate(a.date).getTime());
}
