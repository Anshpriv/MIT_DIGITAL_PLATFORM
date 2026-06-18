/*
Firestore indexes needed:
- profileEvents: compound index on [profileUid, type, timestamp DESC] (if collection group query)
*/

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentUid, type, viewerUid, metadata = {} } = body;

    if (!studentUid || !type) {
      return NextResponse.json(
        { error: "studentUid and type are required fields" },
        { status: 400 }
      );
    }

    const validTypes = [
      "resume_download",
      "github_click",
      "linkedin_click",
      "project_click",
      "recruiter_save",
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid event type: ${type}` }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK is not initialized on the server" },
        { status: 500 }
      );
    }

    const timestamp = new Date().toISOString();

    // 1. Write event to student's events subcollection
    const eventsCol = adminDb.collection("profileEvents").doc(studentUid).collection("events");
    await eventsCol.add({
      timestamp,
      type,
      viewerUid: viewerUid || null,
      metadata,
    });

    // 2. Increment specific counter in student's profile for quick metrics
    const studentDocRef = adminDb.collection("students").doc(studentUid);
    const studentDoc = await studentDocRef.get();

    if (studentDoc.exists) {
      const updateData: Record<string, any> = {
        updatedAt: timestamp,
      };

      if (type === "resume_download") {
        const currentDownloads = studentDoc.data()?.resumeDownloads || 0;
        updateData.resumeDownloads = currentDownloads + 1;
      }

      await studentDocRef.update(updateData);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Track event endpoint failed:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error tracking engagement event" },
      { status: 500 }
    );
  }
}
