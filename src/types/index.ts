export type Branch =
  | "AIDS"
  | "CSE"
  | "CSIT"
  | "IT"
  | "ENTC"
  | "Mechanical"
  | "Civil"
  | "Chemical"
  | "Other";

export const BRANCHES: Branch[] = [
  "AIDS", "CSE", "CSIT", "IT", "ENTC", "Mechanical", "Civil", "Chemical", "Other",
];

export interface Project {
  id: string;
  name: string;
  description: string;
  techStack: string[];
  githubUrl?: string;
  liveUrl?: string;
  thumbnailUrl?: string;
  featured?: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  event: string;
  date: string;
  position?: string;
  description?: string;
  certificateUrl?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  credentialUrl?: string;
  logoUrl?: string;
}

export interface HackathonEntry {
  id: string;
  event: string;
  date: string;
  teamSize?: number;
  projectBuilt?: string;
  result?: "winner" | "finalist" | "participant";
  description?: string;
}

export interface GitHubStats {
  username: string;
  repoCount: number;
  totalStars: number;
  totalForks: number;
  followers: number;
  topLanguages: { name: string; percent: number }[];
  commitsLastYear: number;
  contributionStreak: number;
  overallGitHubScore: number;
  lastSyncedAt: string;
  contributionCalendar?: { date: string; contributionCount: number; color: string }[];
  repos?: {
    name: string;
    description: string | null;
    language: string | null;
    stars: number;
    forks: number;
    topics: string[];
    updatedAt: string;
    homepage: string | null;
  }[];
}

export interface PortfolioAnalysis {
  designScore: number;
  technicalDepthScore: number;
  recruiterReadabilityScore: number;
  projectQualityScore: number;
  overallScore: number;
  detectedProjects: string[];
  detectedSkills: string[];
  detectedTechStack: string[];
  hasDeploymentLinks: boolean;
  hasGitHubLinks: boolean;
  hasContactInfo: boolean;
  isResponsive: boolean;
  strengths: string[];
  improvements: string[];
  recruiterVerdict: string;
  analyzedAt: string;
}

export interface TimelineEvent {
  id: string;
  type:
    | "hackathon_win"
    | "achievement"
    | "certification"
    | "github_repo"
    | "project"
    | "profile_milestone";
  date: string;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface ProfileView {
  timestamp: string;
  viewerUid: string | null;
  isRecruiter: boolean;
  sessionId: string;
}

export interface Student {
  uid: string;
  email: string;
  name: string;
  avatar?: string;
  branch: Branch;
  graduationYear: number;
  studentId?: string;
  bio?: string;
  skills: string[];
  techStack: string[];
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  githubConnected: boolean;
  githubData: GitHubStats | null;
  portfolioScore: number | null;
  portfolioAnalysis: PortfolioAnalysis | null;
  portfolioHealthScore?: {
    healthScore: number;
    breakdown: {
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
    };
  } | null;
  achievements: Achievement[];
  hackathons: HackathonEntry[];
  certifications: Certification[];
  projects: Project[];
  createdAt: string;
  updatedAt: string;
  isProfilePublic: boolean;
  role: "student";
  lastAnalyzedAt?: string | null;
  aiNarrative?: string | null;
}

export interface Recruiter {
  uid: string;
  email: string;
  name: string;
  companyName: string;
  designation: string;
  companyEmail: string;
  createdAt: string;
  updatedAt: string;
  role: "recruiter";
}