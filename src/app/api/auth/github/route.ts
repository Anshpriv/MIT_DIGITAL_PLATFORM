import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "Missing uid parameter" }, { status: 400 });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.error("Missing GitHub Client ID or Redirect URI in environment variables");
      return NextResponse.json(
        { error: "GitHub OAuth is not configured on this server." },
        { status: 500 }
      );
    }

    const scope = "read:user repo read:org";
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(scope)}&state=${uid}&prompt=select_account`;

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("GitHub auth redirect error:", error);
    return NextResponse.json({ error: error.message || "Failed to redirect to GitHub" }, { status: 500 });
  }
}
