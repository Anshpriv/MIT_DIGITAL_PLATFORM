import type { Student } from "@/types";

export interface HealthScoreBreakdown {
  projectComplexity: number;
  deploymentAvailability: number;
  githubIntegration: number;
  contentQuality: number;
  achievementsAdded: number;
  technicalDiversity: number;
  profileCompleteness: number;
  impactStatements: number;
  hasResume: number;
  hasLinkedIn: number;
}

export interface HealthScoreResult {
  healthScore: number;
  breakdown: HealthScoreBreakdown;
}

/**
 * Calculates the overall portfolio health score (0-100) for a student.
 */
export function calculatePortfolioHealthScore(
  student: Student
): HealthScoreResult {
  const analysis = student.portfolioAnalysis;
  const github = student.githubData;

  // 1. Project Complexity (Max 15): based on Gemini technical depth + deployment status
  const techDepth = analysis?.technicalDepthScore || 0; // 0-20
  const hasDeploy = analysis?.hasDeploymentLinks || false;
  const projectComplexity = Math.min(
    15,
    Math.round((techDepth / 20) * 12 + (hasDeploy ? 3 : 0))
  );

  // 2. Deployment Availability (Max 10): has live links
  const deploymentAvailability = hasDeploy ? 10 : 0;

  // 3. GitHub Integration (Max 10): connection status + repository count
  const isConnected = student.githubConnected || false;
  const repoCount = github?.repos?.length || 0;
  const githubIntegration = isConnected
    ? Math.min(10, 5 + Math.round((repoCount / 5) * 5))
    : 0;

  // 4. Content Quality (Max 15): recruiter readability score from Gemini
  const readability = analysis?.recruiterReadabilityScore || 0; // 0-20
  const contentQuality = Math.round((readability / 20) * 15);

  // 5. Achievements Added (Max 10): count of achievements and certifications
  const achCount = (student.achievements?.length || 0) + (student.certifications?.length || 0);
  const achievementsAdded = Math.min(10, Math.round(achCount * 2.5));

  // 6. Technical Diversity (Max 10): language diversity from GitHub data
  const languages = github?.topLanguages ? github.topLanguages.map((l) => l.name) : [];
  const technicalDiversity = Math.min(10, Math.round(languages.length * 3.5));

  // 7. Profile Completeness (Max 15): checking standard profile fields
  let completenessScore = 0;
  if (student.skills && student.skills.length > 0) completenessScore += 3;
  if (student.techStack && student.techStack.length > 0) completenessScore += 3;
  if (student.projects && student.projects.length > 0) completenessScore += 3;
  if (student.graduationYear && student.branch) completenessScore += 3;
  if (student.name && student.studentId) completenessScore += 3;
  const profileCompleteness = completenessScore;

  // 8. Impact Statements (Max 10): project descriptions containing metrics/numbers
  let impactScore = 0;
  if (student.projects && student.projects.length > 0) {
    const totalProjects = student.projects.length;
    const digitDescCount = student.projects.filter((p) =>
      p.description ? /\d+/.test(p.description) : false
    ).length;
    impactScore = Math.round((digitDescCount / totalProjects) * 10);
  }
  const impactStatements = Math.min(10, impactScore);

  // 9. Has Resume (Max 5)
  // Check student fields for resume link
  const hasResume = (student as any).resumeUrl || (student as any).resume ? 5 : 0;

  // 10. Has LinkedIn (Max 5)
  const hasLinkedIn = (student as any).linkedinUrl || (student as any).linkedin ? 5 : 0;

  // Total Score (Capped at 100)
  const rawTotal =
    projectComplexity +
    deploymentAvailability +
    githubIntegration +
    contentQuality +
    achievementsAdded +
    technicalDiversity +
    profileCompleteness +
    impactStatements +
    hasResume +
    hasLinkedIn;

  const healthScore = Math.min(100, rawTotal);

  return {
    healthScore,
    breakdown: {
      projectComplexity,
      deploymentAvailability,
      githubIntegration,
      contentQuality,
      achievementsAdded,
      technicalDiversity,
      profileCompleteness,
      impactStatements,
      hasResume,
      hasLinkedIn,
    },
  };
}
