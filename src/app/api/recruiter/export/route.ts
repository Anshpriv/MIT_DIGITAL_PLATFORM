import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const recruiterId = searchParams.get("recruiterId");
    const listId = searchParams.get("listId");

    if (!recruiterId) {
      return NextResponse.json({ error: "Recruiter ID is required" }, { status: 400 });
    }

    let studentIds: string[] = [];

    // 1. Fetch student IDs
    if (listId) {
      const listSnap = await adminDb
        .collection("recruiterLists")
        .doc(recruiterId)
        .collection("lists")
        .doc(listId)
        .get();

      if (listSnap.exists) {
        studentIds = listSnap.data()?.studentIds || [];
      }
    } else {
      const bookmarksSnap = await adminDb
        .collection("bookmarks")
        .doc(recruiterId)
        .collection("candidates")
        .get();

      studentIds = bookmarksSnap.docs.map((doc: any) => doc.id);
    }

    // 2. Fetch student profiles
    const students: any[] = [];
    for (const sId of studentIds) {
      const studentSnap = await adminDb.collection("students").doc(sId).get();
      if (studentSnap.exists) {
        students.push(studentSnap.data());
      }
    }

    // Helper to escape fields for CSV format
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    // 3. Build CSV string
    const headers = [
      "Name",
      "Email",
      "Branch",
      "Graduation Year",
      "Skills",
      "Portfolio Score",
      "GitHub URL",
      "LinkedIn URL",
      "Portfolio URL",
    ];

    const rows = students.map((s) => [
      escapeCSV(s.name),
      // Only return email if student profile allows public viewing or email is shared
      escapeCSV(s.isProfilePublic ? s.email : "Private"),
      escapeCSV(s.branch),
      escapeCSV(s.graduationYear),
      escapeCSV((s.skills || []).join(", ")),
      escapeCSV(s.portfolioScore ?? "N/A"),
      escapeCSV(s.githubUrl || ""),
      escapeCSV(s.linkedinUrl || ""),
      escapeCSV(s.portfolioUrl || ""),
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    // 4. Return as downloadable file attachment
    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", "text/csv; charset=utf-8");
    responseHeaders.set(
      "Content-Disposition",
      `attachment; filename="mit_wpu_candidates_export_${new Date().toISOString().split("T")[0]}.csv"`
    );

    return new Response(csvContent, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error("CSV Export API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to export candidates" },
      { status: 500 }
    );
  }
}
