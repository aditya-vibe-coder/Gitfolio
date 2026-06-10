export function computeOverallScore(allMetrics) {
  // ────────────────────────────────────────────────────
  // Stage 1 — Gather raw component scores
  // ────────────────────────────────────────────────────
  const projectRaw      = allMetrics.projectRaw ?? 0;
  const languageRaw     = allMetrics.languageRaw ?? 0;
  const contributionRaw = allMetrics.contributionRaw ?? 0;
  const profileRaw      = allMetrics.profileRaw ?? 100;
  const hygieneRaw      = allMetrics.hygieneRaw ?? 50;

  const activeDays          = allMetrics.activeDays ?? 0;
  const totalContributions  = allMetrics.totalContributions ?? 0;
  const repos               = allMetrics.repos ?? [];

  const publicRepoCount = repos.filter(r => !r.private && !r.fork).length;

  // ────────────────────────────────────────────────────
  // Stage 2 — Apply hard caps and floors per component
  // ────────────────────────────────────────────────────

  // Contribution component (strictest gate)
  let adjustedContribution;
  if (activeDays === 0 || totalContributions === 0) {
    adjustedContribution = 0; // HARD ZERO
  } else if (activeDays < 7) {
    adjustedContribution = Math.min(contributionRaw, 8);
  } else if (activeDays < 20) {
    adjustedContribution = Math.min(contributionRaw, 22);
  } else if (activeDays < 50) {
    adjustedContribution = Math.min(contributionRaw, 48);
  } else if (activeDays < 100) {
    adjustedContribution = Math.min(contributionRaw, 72);
  } else {
    adjustedContribution = contributionRaw;
  }

  // Project component (volume cap)
  const projectCap =
    publicRepoCount === 0 ? 0 :
    publicRepoCount <= 2  ? 20 :
    publicRepoCount <= 4  ? 42 :
    publicRepoCount <= 7  ? 63 :
    publicRepoCount <= 10 ? 80 :
    publicRepoCount <= 15 ? 92 : 100;

  const adjustedProject = Math.min(projectRaw, projectCap);

  // Language component (repo-count ceiling)
  const languageCap =
    publicRepoCount <= 2  ? 32 :
    publicRepoCount <= 5  ? 58 :
    publicRepoCount <= 8  ? 78 : 100;

  const adjustedLanguage = Math.min(languageRaw, languageCap);

  // Profile and hygiene: use raw as-is
  const adjustedProfile = profileRaw;
  const adjustedHygiene = hygieneRaw;

  // ────────────────────────────────────────────────────
  // Stage 3 — Weighted sum
  // ────────────────────────────────────────────────────
  const weights = {
    project: 0.30,
    language: 0.25,
    contribution: 0.20,
    profile: 0.15,
    hygiene: 0.10,
  };

  // Adjusted weighted points per component (for breakdown display)
  const breakdownPoints = {
    project:      Math.round(adjustedProject * weights.project),
    language:     Math.round(adjustedLanguage * weights.language),
    contribution: Math.round(adjustedContribution * weights.contribution),
    profile:      Math.round(adjustedProfile * weights.profile),
    hygiene:      Math.round(adjustedHygiene * weights.hygiene),
  };

  const maxPoints = {
    project:      30,
    language:     25,
    contribution: 20,
    profile:      15,
    hygiene:      10,
  };

  const weightedScore =
    (adjustedProject    * weights.project)     +
    (adjustedLanguage   * weights.language)    +
    (adjustedContribution * weights.contribution) +
    (adjustedProfile    * weights.profile)     +
    (adjustedHygiene    * weights.hygiene);

  // ────────────────────────────────────────────────────
  // Stage 4 — Global volume multiplier (applied LAST)
  // ────────────────────────────────────────────────────
  const repoFactor     = Math.min(1, publicRepoCount / 10); // 1.0 at 10+ repos
  const activityFactor = activeDays === 0 ? 0.15 : Math.min(1, activeDays / 80);

  // Multiplier range: ~0.38 (both near zero) to 1.0 (10+ repos, 80+ active days)
  const volumeMultiplier = 0.40 + (0.32 * repoFactor) + (0.28 * activityFactor);

  const finalScore = Math.max(1, Math.round(weightedScore * volumeMultiplier));

  // ────────────────────────────────────────────────────
  // Stage 5 — Tier label redesign
  // ────────────────────────────────────────────────────
  const TIERS = [
    { min: 86, label: 'Exceptional',     color: '#22c55e', desc: 'Top 5% of candidates' },
    { min: 70, label: 'Strong',          color: '#84cc16', desc: 'Interview-ready' },
    { min: 55, label: 'Competitive',     color: '#eab308', desc: 'Needs polish' },
    { min: 38, label: 'Developing',      color: '#f97316', desc: 'Significant gaps' },
    { min: 20, label: 'Beginner',        color: '#ef4444', desc: 'Keep building' },
    { min: 0,  label: 'Getting Started', color: '#dc2626', desc: 'Critical gaps detected' },
  ];

  let tier = TIERS.find(t => finalScore >= t.min) || TIERS[TIERS.length - 1];

  // ────────────────────────────────────────────────────
  // Stage 6 — Strengths and weaknesses identification
  // ────────────────────────────────────────────────────
  const adjustedValues = {
    project:      adjustedProject,
    language:     adjustedLanguage,
    contribution: adjustedContribution,
    profile:      adjustedProfile,
    hygiene:      adjustedHygiene,
  };

  const strengths = Object.entries(adjustedValues)
    .filter(([, v]) => v >= 70)
    .map(([k]) => k);

  const weaknesses = Object.entries(adjustedValues)
    .filter(([, v]) => v < 40)
    .sort(([, a], [, b]) => a - b) // worst first
    .map(([k]) => ({ metric: k, score: adjustedValues[k] }));

  // Coaching messages — top 3 weaknesses sorted by severity
  const coachingMessages = [];
  for (const w of weaknesses) {
    if (w.metric === 'contribution' && adjustedContribution === 0) {
      coachingMessages.push({
        component: 'contribution',
        adjustedScore: adjustedContribution,
        maxPossible: 100,
        coachingMessage: 'Zero contributions in the last year. Daily commits—even small ones—are the #1 signal recruiters look for. Start today.',
        actionLink: '/dashboard#contributions'
      });
    } else if (w.metric === 'project' && adjustedProject < 20) {
      coachingMessages.push({
        component: 'project',
        adjustedScore: adjustedProject,
        maxPossible: projectCap,
        coachingMessage: `Only ${publicRepoCount} original public repos. Aim for 8+ quality projects before placement season.`,
        actionLink: '/dashboard#projects'
      });
    } else if (w.metric === 'language' && adjustedLanguage < 35) {
      coachingMessages.push({
        component: 'language',
        adjustedScore: adjustedLanguage,
        maxPossible: languageCap,
        coachingMessage: 'Language depth is shallow across your portfolio. Build more projects across different file types to prove real-world proficiency.',
        actionLink: '/dashboard#languages'
      });
    } else if (w.metric === 'profile' && adjustedProfile < 100) {
      coachingMessages.push({
        component: 'profile',
        adjustedScore: adjustedProfile,
        maxPossible: 100,
        coachingMessage: 'Profile is missing bio/blog/location. Recruiters DO check these.',
        actionLink: '/dashboard#profile'
      });
    } else if (w.metric === 'contribution' && adjustedContribution < 20) {
      coachingMessages.push({
        component: 'contribution',
        adjustedScore: adjustedContribution,
        maxPossible: 100,
        coachingMessage: 'Contribution consistency is low. Set a goal of committing code 5+ days per week.',
        actionLink: '/dashboard#contributions'
      });
    } else if (w.metric === 'project' && adjustedProject < 40) {
      coachingMessages.push({
        component: 'project',
        adjustedScore: adjustedProject,
        maxPossible: projectCap,
        coachingMessage: 'Project quality needs improvement. Add READMEs, live demos, and licenses to your repositories.',
        actionLink: '/dashboard#projects'
      });
    }
  }

  // Top coaching output: first/highest-severity message
  const coachingMessage = coachingMessages[0]?.coachingMessage || '';

  // Score breakdown with earned/max per component
  const scoreBreakdown = {
    project:      { earned: adjustedProject * 0.30,      max: 30  },
    language:     { earned: adjustedLanguage * 0.25,     max: 25  },
    contribution: { earned: adjustedContribution * 0.20, max: 20  },
    profile:      { earned: profileRaw * 0.15,           max: 15  },
    hygiene:      { earned: hygieneRaw * 0.10,           max: 10  },
  };

  // Combined Score (with DSA if LeetCode connected)
  let combinedScore = null;
  let dsaTier = null;
  if (allMetrics.leetcodeData) {
    const dsaSolves = allMetrics.leetcodeData.total ?? 0;
    const dsaScore =
      dsaSolves >= 400 ? 100 : dsaSolves >= 250 ? 85 : dsaSolves >= 150 ? 70 :
      dsaSolves >= 75  ? 55  : dsaSolves >= 20  ? 35  : dsaSolves > 0 ? 15 : 0;
    dsaTier =
      dsaSolves >= 400 ? 'Grandmaster' :
      dsaSolves >= 250 ? 'Expert' :
      dsaSolves >= 150 ? 'Proficient' :
      dsaSolves >= 75  ? 'Practicing' :
      dsaSolves >= 20  ? 'Beginner' :
      dsaSolves > 0    ? 'Just Started' : 'None';
    // Rebalance weights with DSA as 6th component
    const cProject      = adjustedProject;
    const cLanguage     = adjustedLanguage;
    const cContribution = adjustedContribution;
    const cProfile      = profileRaw;
    const cHygiene      = hygieneRaw;
    const cDSA          = dsaScore;
    const combinedWeighted =
      (cProject      * 0.25) +
      (cLanguage     * 0.20) +
      (cContribution * 0.18) +
      (cProfile      * 0.12) +
      (cHygiene      * 0.08) +
      (cDSA          * 0.17);
    combinedScore = Math.max(1, Math.round(combinedWeighted * volumeMultiplier));
  }

  return {
    interviewReadiness: finalScore,
    combinedScore,
    dsaTier,
    weightedScore: Math.round(weightedScore),
    volumeMultiplier: Number(volumeMultiplier.toFixed(2)),
    adjustedScores: adjustedValues,
    breakdown: breakdownPoints,
    maxPoints,
    tier: { label: tier.label, color: tier.color, desc: tier.desc },
    strengths,
    weaknesses: weaknesses.map(w => w.metric),
    coachingMessages: coachingMessages.slice(0, 3),
    coachingMessage,
    scoreBreakdown,
  };
}
