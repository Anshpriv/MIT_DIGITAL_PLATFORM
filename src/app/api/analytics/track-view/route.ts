/*
Firestore indexes needed:
- profileViews: compound index on [profileUid, timestamp DESC] (if collection group query)
- profileEvents: compound index on [profileUid, type, timestamp DESC] (if collection group query)
*/

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { profileUid, viewerUid, isRecruiter, sessionId } = body;

    if (!profileUid) {
      return NextResponse.json({ error: "profileUid is required" }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK is not initialized on the server" },
        { status: 500 }
      );
    }

    const userAgent = request.headers.get("user-agent") || "unknown";

    // Bot filtering: skip search engine crawler bots
    const isBot = /bot|googlebot|crawler|spider|robot|crawling/i.test(userAgent);
    if (isBot) {
      return NextResponse.json({ success: true, skipped: "bot_detected" });
    }

    // 1. Check for deduplication (same viewerUid or sessionId within last 30 minutes)
    const viewsCol = adminDb.collection("profileViews").doc(profileUid).collection("views");
    const lastViewsSnap = await viewsCol.orderBy("timestamp", "desc").limit(20).get();

    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    let isDuplicate = false;

    lastViewsSnap.forEach((doc: any) => {
      const data = doc.data();
      const viewTime = new Date(data.timestamp).getTime();

      if (viewTime > thirtyMinutesAgo) {
        // If logged in viewer matches
        if (viewerUid && data.viewerUid === viewerUid) {
          isDuplicate = true;
        }
        // If anonymous, match by sessionId
        if (!viewerUid && !data.viewerUid && sessionId && data.sessionId === sessionId) {
          isDuplicate = true;
        }
      }
    });

    if (isDuplicate) {
      return NextResponse.json({ success: true, duplicated: true });
    }

    const timestamp = new Date().toISOString();

    // 2. Write view to subcollection
    await viewsCol.add({
      timestamp,
      viewerUid: viewerUid || null,
      isRecruiter: !!isRecruiter,
      sessionId: sessionId || "anonymous-session",
      userAgent,
    });

    // 3. Increment views on student document
    const studentDocRef = adminDb.collection("students").doc(profileUid);
    const studentDoc = await studentDocRef.get();

    if (studentDoc.exists) {
      const updateData: Record<string, any> = {
        lastViewedAt: timestamp,
        updatedAt: timestamp,
      };

      // Increment totalViews
      const currentTotalViews = studentDoc.data()?.totalViews || 0;
      updateData.totalViews = currentTotalViews + 1;

      // Increment recruiterViews if applicable
      if (isRecruiter) {
        const currentRecruiterViews = studentDoc.data()?.recruiterViews || 0;
        updateData.recruiterViews = currentRecruiterViews + 1;
      }

      await studentDocRef.update(updateData);
    }

    return NextResponse.json({ success: true, duplicated: false });
  } catch (error: any) {
    console.error("Track view endpoint failed:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error tracking profile view" },
      { status: 500 }
    );
  }
}
