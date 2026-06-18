import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Verify the Firebase ID token using the Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Determine the user's role from Firestore
    let role: "student" | "recruiter" | null = null;

    const studentDoc = await adminDb.collection("students").doc(uid).get();
    if (studentDoc.exists) {
      role = "student";
    } else {
      const recruiterDoc = await adminDb.collection("recruiters").doc(uid).get();
      if (recruiterDoc.exists) {
        role = "recruiter";
      }
    }

    return NextResponse.json({
      uid,
      email: decodedToken.email,
      role,
      name: decodedToken.name,
      picture: decodedToken.picture,
    });
  } catch (error: any) {
    console.error("Token verification failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify token" },
      { status: 401 }
    );
  }
}
