import axios from "axios";

export interface GitHubRepoDetails {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
  updatedAt: string;
  homepage: string | null;
}

export interface ContributionDay {
  contributionCount: number;
  date: string;
  color: string;
}

export interface GitHubDataResult {
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
  // Raw stats for components
  contributionCalendar: ContributionDay[];
  repos: GitHubRepoDetails[];
}

export async function fetchGitHubUserData(accessToken: string): Promise<GitHubDataResult> {
  const headers = {
    Authorization: `token ${accessToken}`,
    Accept: "application/json",
    "User-Agent": "MIT-WPU-Talent-Hub",
  };

  // 1. Fetch user profile
  const userProfileRes = await axios.get("https://api.github.com/user", { headers });
  const profile = userProfileRes.data;
  const username = profile.login;
  const followers = profile.followers;

  // 2. Fetch repos (up to 100 owned repos)
  const reposRes = await axios.get("https://api.github.com/user/repos", {
    headers,
    params: {
      per_page: 100,
      type: "owner",
      sort: "updated",
    },
  });

  const rawRepos = reposRes.data || [];
  const repos: GitHubRepoDetails[] = rawRepos.map((repo: any) => ({
    name: repo.name,
    description: repo.description || null,
    language: repo.language || null,
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    topics: repo.topics || [],
    updatedAt: repo.updated_at,
    homepage: repo.homepage || null,
  }));

  // Calculations on repositories
  const repoCount = rawRepos.filter((r: any) => !r.private).length;
  const totalStars = repos.reduce((sum, r) => sum + r.stars, 0);
  const totalForks = repos.reduce((sum, r) => sum + r.forks, 0);
  const openSourceRepos = repos.filter((r: any) => !r.fork).length;
  const deployedProjects = repos.filter((r) => !!r.homepage).length;

  // Language breakdown
  const languageCounts: Record<string, number> = {};
  let totalLanguageRepos = 0;
  repos.forEach((r) => {
    if (r.language) {
      languageCounts[r.language] = (languageCounts[r.language] || 0) + 1;
      totalLanguageRepos++;
    }
  });

  const topLanguages = Object.entries(languageCounts)
    .map(([name, count]) => ({
      name,
      percent: totalLanguageRepos > 0 ? (count / totalLanguageRepos) * 100 : 0,
    }))
    .sort((a, b) => b.percent - a.percent);

  // Distinct languages
  const distinctLanguages = Object.keys(languageCounts).length;

  // 3. Fetch Contribution Stats from GraphQL
  const graphqlQuery = {
    query: `
      query($login: String!) {
        user(login: $login) {
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                  color
                }
              }
            }
          }
        }
      }
    `,
    variables: { login: username },
  };

  let commitsLastYear = 0;
  let contributionStreak = 0;
  let contributionCalendar: ContributionDay[] = [];
  let maxZeroStreak = 0;

  try {
    const gqlRes = await axios.post("https://api.github.com/graphql", graphqlQuery, {
      headers: {
        Authorization: `bearer ${accessToken}`,
        "User-Agent": "MIT-WPU-Talent-Hub",
      },
    });

    const calendar = gqlRes.data?.data?.user?.contributionsCollection?.contributionCalendar;
    if (calendar) {
      commitsLastYear = calendar.totalContributions || 0;
      const weeks = calendar.weeks || [];
      contributionCalendar = weeks.flatMap((w: any) => w.contributionDays || []);

      // Sort contribution calendar by date to ensure proper streak calculations
      contributionCalendar.sort((a, b) => a.date.localeCompare(b.date));

      // Calculate streak & max zero streak (gaps)
      let tempStreak = 0;
      let maxStreak = 0;
      let tempZeroStreak = 0;

      for (const day of contributionCalendar) {
        if (day.contributionCount > 0) {
          tempStreak++;
          if (tempStreak > maxStreak) {
            maxStreak = tempStreak;
          }
          tempZeroStreak = 0;
        } else {
          tempStreak = 0;
          tempZeroStreak++;
          if (tempZeroStreak > maxZeroStreak) {
            maxZeroStreak = tempZeroStreak;
          }
        }
      }

      // Calculate current streak
      let currentStreakCount = 0;
      const reversedDays = [...contributionCalendar].reverse();
      const todayStr = new Date().toISOString().split("T")[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      let startIndex = reversedDays.findIndex(d => d.date === todayStr);
      if (startIndex === -1) {
        startIndex = reversedDays.findIndex(d => d.date === yesterdayStr);
      }
      if (startIndex === -1) {
        startIndex = 0;
      }

      for (let i = startIndex; i < reversedDays.length; i++) {
        if (reversedDays[i].contributionCount > 0) {
          currentStreakCount++;
        } else {
          // If checking today and it is 0, allow it and check yesterday
          if (i === startIndex && reversedDays[i].date === todayStr) {
            continue;
          }
          break;
        }
      }

      contributionStreak = currentStreakCount > 0 ? currentStreakCount : maxStreak;
    }
  } catch (err) {
    console.error("Failed to fetch GitHub GraphQL contributions calendar", err);
  }

  // 4. Calculate Scores
  // repoCount (raw number, max 20 at 10 repos)
  const repoScore = Math.min(20, repoCount * 2);

  // totalStars (sum of stars across repos, max 20 at 40 stars)
  const starScore = Math.min(20, totalStars * 0.5);

  // diversityScore (number of distinct languages / 10, capped at 10)
  const diversityScore = Math.min(10, distinctLanguages);
  // points = diversityScore * 5, max 15 (maxed out at 3 languages)
  const diversityPoints = Math.min(15, diversityScore * 5);

  // consistencyScore (based on commit distribution — no 90-day gaps = high score)
  // Let's rate out of 15. If gap >= 90 days, 0 points. If gap <= 14 days, 15 points.
  let consistencyScore = 15;
  if (maxZeroStreak >= 90) {
    consistencyScore = 0;
  } else if (maxZeroStreak > 14) {
    // scale from 14 to 90
    consistencyScore = Math.max(0, 15 - Math.floor((maxZeroStreak - 14) * (15 / 76)));
  }

  // deployedProjects (repos with homepage URL set, max 15 at 5 projects)
  const deployedScore = Math.min(15, deployedProjects * 3);

  // commitsLastYear / 100, max 15 (maxed out at 1500 contributions)
  const commitScore = Math.min(15, commitsLastYear / 100);

  const overallGitHubScore = Math.round(
    repoScore + starScore + diversityPoints + consistencyScore + deployedScore + commitScore
  );

  return {
    username,
    repoCount,
    totalStars,
    totalForks,
    followers,
    topLanguages,
    commitsLastYear,
    contributionStreak,
    overallGitHubScore,
    lastSyncedAt: new Date().toISOString(),
    contributionCalendar,
    repos,
  };
}
