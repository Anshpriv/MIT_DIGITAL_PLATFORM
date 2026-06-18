import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { decrypt } from "@/lib/encryption";
import { fetchGitHubUserData } from "@/lib/github-api";

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}

async function handleSync(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured on this server." },
      { status: 500 }
    );
  }

  if (authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firebase Admin SDK is not configured in this environment." },
      { status: 500 }
    );
  }

  try {
    // 1. Fetch all students who have linked their GitHub accounts
    const studentsSnap = await adminDb
      .collection("students")
      .where("githubConnected", "==", true)
      .get();

    const results: any[] = [];

    // 2. Iterate through and refresh their profile statistics
    for (const doc of studentsSnap.docs) {
      const studentId = doc.id;
      const data = doc.data();
      const encryptedToken = data.githubAccessTokenEncrypted;

      if (!encryptedToken) {
        results.push({ studentId, status: "skipped", reason: "No access token found" });
        continue;
      }

      try {
        const accessToken = decrypt(encryptedToken);
        const githubData = await fetchGitHubUserData(accessToken);

        // Update Firestore document with updated metrics
        await adminDb.collection("students").doc(studentId).update({
          githubData: {
            username: githubData.username,
            repoCount: githubData.repoCount,
            totalStars: githubData.totalStars,
            totalForks: githubData.totalForks,
            followers: githubData.followers,
            topLanguages: githubData.topLanguages,
            commitsLastYear: githubData.commitsLastYear,
            contributionStreak: githubData.contributionStreak,
            overallGitHubScore: githubData.overallGitHubScore,
            lastSyncedAt: githubData.lastSyncedAt,
            contributionCalendar: githubData.contributionCalendar,
            repos: githubData.repos,
          },
          updatedAt: new Date().toISOString(),
        });

        results.push({ studentId, status: "success", username: githubData.username });
      } catch (err: any) {
        console.error(`Failed to refresh GitHub data for student: ${studentId}`, err);
        results.push({ studentId, status: "failed", error: err.message || "Refresh failed" });
      }
    }

    return NextResponse.json({
      message: "Sync cron finished",
      processedCount: studentsSnap.size,
      results,
    });
  } catch (error: any) {
    console.error("Cron GitHub sync handler error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute sync job" }, { status: 500 });
  }
}
