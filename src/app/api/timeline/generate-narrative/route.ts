import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { generateTimeline } from "@/lib/timeline-generator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentUid } = body;

    if (!studentUid) {
      return NextResponse.json({ error: "studentUid is a required parameter" }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK is not initialized on the server" },
        { status: 500 }
      );
    }

    // 1. Fetch student document from Firestore
    const studentDocRef = adminDb.collection("students").doc(studentUid);
    const studentDoc = await studentDocRef.get();
    if (!studentDoc.exists) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const studentData = studentDoc.data()!;
    const { name, branch, graduationYear } = studentData;

    // 2. Generate and filter timeline events (top 10 significant ones)
    const allEvents = await generateTimeline(studentUid);

    // Filter to capture high-impact events first, then fallback to others
    const highImpact = allEvents.filter(
      (e) => e.type !== "github_repo" && e.type !== "profile_milestone"
    );
    const lowImpact = allEvents.filter(
      (e) => e.type === "github_repo" || e.type === "profile_milestone"
    );

    // Combine and limit to 10 events, then sort chronologically (oldest to newest) for writing progression
    const topEvents = [...highImpact, ...lowImpact]
      .slice(0, 10)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 3. Call Gemini 2.5 Flash
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured on the server environment" },
        { status: 500 }
      );
    }

    const promptText = `You are writing a professional bio for a student's talent profile on MIT-WPU Talent Hub.
Based on these career milestones (in chronological order), write a compelling 3-paragraph narrative (about 150 words total) that:
1. Opens with who they are and their technical focus
2. Highlights their key achievements with impact
3. Closes with their trajectory and what they're looking for

Milestones: ${JSON.stringify(topEvents)}
Student name: ${name || "Unspecified"}, Branch: ${branch || "Unspecified"}, Graduation Year: ${graduationYear || "Unspecified"}

Return ONLY the narrative text, no JSON, no headers, no markdown blocks.`;

    let aiNarrative = "";

    try {
      let geminiModel = "gemini-2.5-flash";
      let geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
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
              contents: [{ parts: [{ text: promptText }] }],
            }),
          }
        );
      }

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        throw new Error(`Gemini API error: Status ${geminiRes.status} - ${errText}`);
      }

      const geminiJson = await geminiRes.json();
      aiNarrative = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
      aiNarrative = aiNarrative.trim();
    } catch (e: any) {
      console.error("Gemini AI narrative generation failed:", e);
      return NextResponse.json(
        { error: `AI Narrative generation failed: ${e.message || "Failed to process content"}` },
        { status: 502 }
      );
    }

    if (!aiNarrative) {
      throw new Error("Gemini returned an empty narrative response.");
    }

    // 4. Update student document with the generated narrative
    await studentDocRef.update({
      aiNarrative,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      aiNarrative,
    });
  } catch (error: any) {
    console.error("Timeline generate-narrative endpoint failed:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error generating narrative" },
      { status: 500 }
    );
  }
}
