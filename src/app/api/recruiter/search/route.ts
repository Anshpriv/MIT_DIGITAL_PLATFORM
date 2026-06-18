import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      recruiterId,
      branch = [],
      graduationYear = [],
      skills = [],
      techStack = [],
      hackathonParticipant = null,
      hasCertifications = null,
      githubConnected = null,
      portfolioScoreRange = [0, 100],
      sortBy = "updatedAt", // "updatedAt" | "portfolioScore" | "githubStars" | "graduationYear"
      page = 1,
      limit = 20,
    } = body;

    if (!recruiterId) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // 1. Verify recruiter exists in the database
    const recruiterDoc = await adminDb.collection("recruiters").doc(recruiterId).get();
    if (!recruiterDoc.exists) {
      return NextResponse.json({ error: "Invalid recruiter session" }, { status: 403 });
    }

    // 2. Fetch all public student profiles
    const studentsSnap = await adminDb
      .collection("students")
      .where("isProfilePublic", "==", true)
      .get();

    let candidates: any[] = [];
    studentsSnap.forEach((doc: any) => {
      const data = doc.data();
      // Remove private credentials
      delete data.password;
      candidates.push(data);
    });

    // 3. Apply Filters in-memory for full dynamic support
    if (branch.length > 0) {
      candidates = candidates.filter((c) => branch.includes(c.branch));
    }

    if (graduationYear.length > 0) {
      candidates = candidates.filter((c) =>
        graduationYear.map(Number).includes(Number(c.graduationYear))
      );
    }

    if (skills.length > 0) {
      candidates = candidates.filter((c) => {
        const studentSkills = (c.skills || []).map((s: string) => s.toLowerCase());
        return skills.every((skill: string) => studentSkills.includes(skill.toLowerCase()));
      });
    }

    if (techStack.length > 0) {
      candidates = candidates.filter((c) => {
        const studentTech = (c.techStack || []).map((t: string) => t.toLowerCase());
        return techStack.every((t: string) => studentTech.includes(t.toLowerCase()));
      });
    }

    if (hackathonParticipant !== null) {
      candidates = candidates.filter((c) => {
        const hasHackathons = Array.isArray(c.hackathons) && c.hackathons.length > 0;
        return hackathonParticipant ? hasHackathons : !hasHackathons;
      });
    }

    if (hasCertifications !== null) {
      candidates = candidates.filter((c) => {
        const hasCerts = Array.isArray(c.certifications) && c.certifications.length > 0;
        return hasCertifications ? hasCerts : !hasCerts;
      });
    }

    if (githubConnected !== null) {
      candidates = candidates.filter((c) => !!c.githubConnected === githubConnected);
    }

    // Portfolio score range filter
    const minScore = portfolioScoreRange[0] ?? 0;
    const maxScore = portfolioScoreRange[1] ?? 100;
    candidates = candidates.filter((c) => {
      const score = c.portfolioScore ?? 0;
      return score >= minScore && score <= maxScore;
    });

    // 4. Sort results
    candidates.sort((a, b) => {
      if (sortBy === "portfolioScore") {
        return (b.portfolioScore ?? 0) - (a.portfolioScore ?? 0);
      }
      if (sortBy === "githubStars") {
        const aStars = a.githubData?.totalStars ?? 0;
        const bStars = b.githubData?.totalStars ?? 0;
        return bStars - aStars;
      }
      if (sortBy === "graduationYear") {
        return (a.graduationYear ?? 0) - (b.graduationYear ?? 0);
      }
      // Default: latest updated
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    });

    // 5. Paginate results
    const totalCount = candidates.length;
    const startIndex = (page - 1) * limit;
    const paginatedCandidates = candidates.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      candidates: paginatedCandidates,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    });
  } catch (error: any) {
    console.error("Recruiter search API error:", error);
    return NextResponse.json({ error: error.message || "Failed to query candidates" }, { status: 500 });
  }
}
