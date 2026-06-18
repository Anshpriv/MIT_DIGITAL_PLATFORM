import { NextResponse } from "next/server";
import axios from "axios";
import { adminDb } from "@/lib/firebase-admin";
import { fetchGitHubUserData } from "@/lib/github-api";
import { encrypt } from "@/lib/encryption";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const uid = searchParams.get("state"); // state parameter holds our student uid

  if (!code || !uid) {
    return NextResponse.redirect(
      new URL("/dashboard/github?sync=error&message=Missing+code+or+state+parameter", request.url)
    );
  }

  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const redirectUri = process.env.GITHUB_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("GitHub Client ID, Client Secret, or Redirect URI is missing on the server.");
    }

    // 1. Exchange OAuth code for an access token
    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    const accessToken = tokenRes.data?.access_token;
    if (!accessToken) {
      throw new Error(
        tokenRes.data?.error_description || "No access token was returned by GitHub."
      );
    }

    // 2. Fetch and calculate GitHub statistics
    const githubData = await fetchGitHubUserData(accessToken);

    // 3. Encrypt the access token
    const encryptedToken = encrypt(accessToken);

    if (!adminDb) {
      throw new Error("Firebase Admin SDK is not configured in this environment. Unable to write data.");
    }

    // 4. Update the student document in Firestore
    await adminDb.collection("students").doc(uid).update({
      githubConnected: true,
      githubUrl: `https://github.com/${githubData.username}`,
      githubAccessTokenEncrypted: encryptedToken,
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

    // 5. Redirect the student back to their GitHub Dashboard with a success message
    return NextResponse.redirect(new URL("/dashboard/github?sync=success", request.url));
  } catch (error: any) {
    console.error("GitHub OAuth callback error:", error);
    const errorMessage = error.message || "Failed to process GitHub authentication";
    return NextResponse.redirect(
      new URL(`/dashboard/github?sync=error&message=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
