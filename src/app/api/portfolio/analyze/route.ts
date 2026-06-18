import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { calculatePortfolioHealthScore } from "@/lib/portfolio-score";
import type { Student } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { portfolioUrl, studentUid } = body;

    if (!portfolioUrl || !studentUid) {
      return NextResponse.json(
        { error: "portfolioUrl and studentUid are required parameters" },
        { status: 400 }
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK is not initialized on the server" },
        { status: 500 }
      );
    }

    // 1. Authenticate Request
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const { getAuth } = await import("firebase-admin/auth");
        const decodedToken = await getAuth().verifyIdToken(token);
        if (decodedToken.uid !== studentUid) {
          return NextResponse.json(
            { error: "Unauthorized: ID Token mismatch with requested UID" },
            { status: 403 }
          );
        }
      } catch (e: any) {
        console.error("Token verification failed:", e);
        return NextResponse.json(
          { error: "Unauthorized: Invalid Firebase token" },
          { status: 401 }
        );
      }
    }

    // Fetch existing student profile first to check rate limits and get current details
    const studentDocRef = adminDb.collection("students").doc(studentUid);
    const studentDoc = await studentDocRef.get();
    if (!studentDoc.exists) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const studentData = studentDoc.data() as Student;

    // Check rate limit: once every 24 hours per user
    const lastAnalyzed = studentData.portfolioAnalysis?.analyzedAt || (studentData as any).lastAnalyzedAt;
    if (lastAnalyzed) {
      const hoursSince = (Date.now() - new Date(lastAnalyzed).getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const hoursLeft = Math.ceil(24 - hoursSince);
        return NextResponse.json(
          { error: `Analysis is rate limited. Please try again in ${hoursLeft} hours.` },
          { status: 429 }
        );
      }
    }

    // 2. Step 1 — Crawl Portfolio URL
    let htmlContent = "";
    try {
      const res = await fetch(portfolioUrl, {
        headers: { "User-Agent": "MIT-WPU Talent Hub Portfolio Crawler" },
        next: { revalidate: 0 },
      });
      if (!res.ok) {
        throw new Error(`HTTP error fetching portfolio: status ${res.status}`);
      }
      htmlContent = await res.text();
    } catch (e: any) {
      console.error("Failed to crawl portfolio URL:", e);
      return NextResponse.json(
        { error: `Failed to crawl portfolio: ${e.message || "Network error"}` },
        { status: 422 }
      );
    }

    // Extract details
    const titleMatch = htmlContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : "";

    const descMatch =
      htmlContent.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i) ||
      htmlContent.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["']/i);
    const metaDescription = descMatch ? descMatch[1].trim() : "";

    // Extract all absolute/relative href links
    const hrefLinks: string[] = [];
    const linkRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
    let match;
    while ((match = linkRegex.exec(htmlContent)) !== null) {
      hrefLinks.push(match[1]);
    }

    // Extract all img alt texts
    const imgAlts: string[] = [];
    const altRegex = /alt=["']([^"']+)["']/gi;
    while ((match = altRegex.exec(htmlContent)) !== null) {
      imgAlts.push(match[1]);
    }

    // Strip script and style tags
    let bodyCleaned = htmlContent.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "");
    bodyCleaned = bodyCleaned.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "");
    // Strip other HTML tags
    bodyCleaned = bodyCleaned.replace(/<[^>]+>/g, " ");
    // Convert entities
    bodyCleaned = bodyCleaned
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"');
    // Normalize spaces
    bodyCleaned = bodyCleaned.replace(/\s+/g, " ").trim();
    // Truncate to fit within safety limits
    if (bodyCleaned.length > 8000) {
      bodyCleaned = bodyCleaned.substring(0, 7990) + "...";
    }

    // 3. Step 2 — Gemini 2.5 Flash Analysis
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured on the server environment" },
        { status: 500 }
      );
    }

    const systemPrompt = `You are an expert tech recruiter evaluating a student's portfolio website for MIT-WPU Talent Hub.
Analyze the provided portfolio content and return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "designScore": <0-20>,
  "technicalDepthScore": <0-20>,
  "recruiterReadabilityScore": <0-20>,
  "projectQualityScore": <0-20>,
  "overallScore": <0-100>,
  "detectedProjects": ["project1", "project2"],
  "detectedSkills": ["skill1", "skill2"],
  "detectedTechStack": ["React", "Node.js"],
  "hasDeploymentLinks": <boolean>,
  "hasGitHubLinks": <boolean>,
  "hasContactInfo": <boolean>,
  "isResponsive": <boolean based on meta viewport tag detection>,
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "recruiterVerdict": "<2 sentence professional summary of this student's portfolio for a recruiter>"
}
Scoring rubric:
- designScore: visual hierarchy, readability, dark/light mode, professional look
- technicalDepthScore: complexity of projects shown, technologies used, problem statements addressed
- recruiterReadabilityScore: is the value clear in first 10 seconds? contact info visible? resume link?
- projectQualityScore: deployed projects, GitHub links, impact statements, screenshots/demos
- overallScore: weighted average where technicalDepth=30%, recruiterReadability=30%, projectQuality=25%, design=15%`;

    const cleanedDataForAI = `Title: ${pageTitle}\nDescription: ${metaDescription}\nLinks: ${hrefLinks.slice(0, 50).join(", ")}\nAlts: ${imgAlts.slice(0, 20).join(", ")}\nText Content:\n${bodyCleaned}`;

    let parsedAnalysis: any;

    try {
      // Try gemini-2.5-flash as requested, with a fallback to gemini-1.5-flash
      let geminiModel = "gemini-2.5-flash";
      let geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `System Prompt:\n${systemPrompt}\n\nPortfolio Content:\n${cleanedDataForAI}` }] }],
            generationConfig: { responseMimeType: "application/json" }
          }),
        }
      );

      if (!geminiRes.ok) {
        console.warn(`Gemini 2.5 Flash returned status ${geminiRes.status}. Retrying with gemini-1.5-flash...`);
        geminiModel = "gemini-1.5-flash";
        geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `System Prompt:\n${systemPrompt}\n\nPortfolio Content:\n${cleanedDataForAI}` }] }],
              generationConfig: { responseMimeType: "application/json" }
            }),
          }
        );
      }

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        throw new Error(`Gemini API error: Status ${geminiRes.status} - ${errText}`);
      }

      const geminiJson = await geminiRes.json();
      let aiTextResponse = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Cleanup JSON wrapping if AI output it as markdown code block
      aiTextResponse = aiTextResponse.trim();
      if (aiTextResponse.startsWith("```json")) {
        aiTextResponse = aiTextResponse.substring(7);
      } else if (aiTextResponse.startsWith("```")) {
        aiTextResponse = aiTextResponse.substring(3);
      }
      if (aiTextResponse.endsWith("```")) {
        aiTextResponse = aiTextResponse.substring(0, aiTextResponse.length - 3);
      }
      aiTextResponse = aiTextResponse.trim();

      parsedAnalysis = JSON.parse(aiTextResponse);
    } catch (e: any) {
      console.error("Gemini AI analysis failed:", e);
      return NextResponse.json(
        { error: `AI analysis failed: ${e.message || "Failed to process portfolio content"}` },
        { status: 502 }
      );
    }

    // 4. Step 3 & 4 — Calculate Health Score & Store in Firestore
    const analysisTimestamp = new Date().toISOString();
    const portfolioAnalysis = {
      ...parsedAnalysis,
      analyzedAt: analysisTimestamp,
    };

    // Construct mock student profile to run the health scorer locally before DB write
    const updatedStudentMock: Student = {
      ...studentData,
      portfolioAnalysis,
      portfolioScore: parsedAnalysis.overallScore,
    };

    const healthScoreResult = calculatePortfolioHealthScore(updatedStudentMock);

    // Save all variables to Firestore
    await studentDocRef.update({
      portfolioScore: parsedAnalysis.overallScore,
      portfolioAnalysis,
      portfolioHealthScore: healthScoreResult,
      lastAnalyzedAt: analysisTimestamp,
      portfolioUrl,
    });

    return NextResponse.json({
      success: true,
      portfolioScore: parsedAnalysis.overallScore,
      portfolioAnalysis,
      portfolioHealthScore: healthScoreResult,
    });
  } catch (error: any) {
    console.error("Portfolio analysis endpoint failed:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error analyzing portfolio" },
      { status: 500 }
    );
  }
}
